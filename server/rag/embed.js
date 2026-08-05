require('dotenv').config()
const { HfInference } = require('@huggingface/inference')
const supabase = require('../supabase')

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)
const MODEL = 'sentence-transformers/all-MiniLM-L6-v2'

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

async function getEmbedding(text) {
  const result = await hf.featureExtraction({
    model: MODEL,
    inputs: text,
  })
  // Mean pooling
  const vectors = result
  if (Array.isArray(vectors[0])) {
    const len = vectors[0].length
    const mean = new Array(len).fill(0)
    for (const vec of vectors) {
      for (let i = 0; i < len; i++) mean[i] += vec[i]
    }
    return mean.map(v => v / vectors.length)
  }
  return vectors
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

  // Clear existing embeddings
  await supabase.from('menu_embeddings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('Cleared existing embeddings')

  console.log('Embedding and storing chunks...')

  for (let i = 0; i < menus.length; i++) {
    const row = menus[i]
    const chunk = chunkFromRow(row)

    const embedding = await getEmbedding(chunk)

    const { error: insertError } = await supabase
      .from('menu_embeddings')
      .insert({
        menu_id: row.id,
        content: chunk,
        embedding,
        date: row.date,
        meal_type: row.meal_type,
        block_category: row.block_category,
        is_special: row.is_special
      })

    if (insertError) {
      console.error(`Error inserting row ${i}:`, insertError.message)
    }

    if ((i + 1) % 20 === 0) {
      console.log(`Embedded ${i + 1}/${menus.length} rows`)
    }

    // Small delay to avoid HF rate limits
    await new Promise(r => setTimeout(r, 100))
  }

  console.log('Done! All menus embedded into Supabase pgvector')
}

embedMenus()