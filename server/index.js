require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.options('/{*path}', cors())
app.use(express.json())

const blocksRouter = require('./routes/blocks')
const usersRouter = require('./routes/users')
const menusRouter = require('./routes/menus')
const attendanceRouter = require('./routes/attendance')
const chatRouter = require('./routes/chat')
const predictRouter = require('./routes/predict')

app.use('/blocks', blocksRouter)
app.use('/users', usersRouter)
app.use('/menus', menusRouter)
app.use('/attendance', attendanceRouter)
app.use('/chat', chatRouter)
app.use('/predict', predictRouter)

app.get('/', (req, res) => {
  res.json({ message: 'MessLoo server is running' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})