import Chat from '../models/Chat.js'
import Room from '../models/Room.js'
import User from '../models/User.js'
import Message from '../models/Message.js'

const models = { Chat, Room }

export const create = async (req, res) => {
	const { text, image, modelType, model, sender } = req.body
	
	try {
		// const model = await models[modelType].findById(model._id)
		// const sender = await User.findById(sender._id)

		// if (!model) return res.status(404).json({ message: 'Chat does not exist.' })
		// if (!sender) return res.status(404).json({ message: 'Logged in sender does not exist.' })

		const message = new Message({ text, image, modelType, model, sender })

		await message.populate({ path: 'model', model: modelType })
		await message.populate('sender', '-password')
		await message.save()
		/*
		const notification = new Notification({ message: message.text, channel: message.model._id, user: message.sender._id })
		await notification.populate('model', '-password')
		await notification.populate('sender', '-password')
		await notification.save()
		*/
		res.status(200).json(message)
	} catch (err) { res.status(500).json(err) }
}

export const of = async (req, res) => {
	try {
		const messages = await Message.find({ model: req.params.id }).populate({ path: 'model', model: req.params.model }).populate('sender', '-password')
		res.status(200).json(messages)
	} catch (err) { res.status(500).json(err) }
}