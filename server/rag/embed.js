require('dotenv').config()
const { ChromaClient } = require('chromadb')
const { pipeline } = require('@xenova/transformers')
const supabase = require('../supabase')

const COLLECTION_NAME = 'mess_menus'

async function getEmbedder() {
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  return embedder
}

function chunkFromRow(row) {
  const date = new Date(row.date).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const special = row.is_special ? ' (Special meal)' : ''
  return `On ${date}, ${row.block_category} block ${row.meal_type}${special} includes: ${row.items}`
}

async function embedMenus() {
  console.log('Fetching menus from Supabase...')

  const { data: menus, error } = await supabase
    .from('menus')
    .select('*')

  if (error) {
    console.error('Error fetching menus:', error.message)
    return
  }

  console.log(`Fetched ${menus.length} menu rows`)

  console.log('Loading embedding model...')
  const embedder = await getEmbedder()

  const client = new ChromaClient()
  
  // Delete existing collection if exists to avoid duplicates
  try {
    await client.deleteCollection({ name: COLLECTION_NAME })
    console.log('Deleted existing collection')
  } catch {
    console.log('No existing collection found')
  }

  const collection = await client.createCollection({ name: COLLECTION_NAME })
  console.log('Created fresh collection')

  console.log('Embedding and storing chunks...')

  for (let i = 0; i < menus.length; i++) {
    const row = menus[i]
    const chunk = chunkFromRow(row)

    const output = await embedder(chunk, { pooling: 'mean', normalize: true })
    const vector = Array.from(output.data)

    await collection.add({
      ids: [row.id],
      embeddings: [vector],
      documents: [chunk],
      metadatas: [{
        date: row.date,
        meal_type: row.meal_type,
        block_category: row.block_category,
        is_special: row.is_special ? 'true' : 'false'
      }]
    })

    if ((i + 1) % 20 === 0) {
      console.log(`Embedded ${i + 1}/${menus.length} rows`)
    }
  }

  console.log('Done! All menus embedded into ChromaDB')
}

embedMenus()