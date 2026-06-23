const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.options('/{*path}', cors())
app.use(express.json())

const blocksRouter = require('./routes/blocks')
const usersRouter = require('./routes/users')

app.use('/blocks', blocksRouter)
app.use('/users', usersRouter)

app.get('/', (req, res) => {
  res.json({ message: 'MessLoo server is running' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})