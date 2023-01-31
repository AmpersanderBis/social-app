import mongoose from 'mongoose'

const schema = mongoose.Schema(
	{
		text: String,
		image: String,
		modelType: String,
		model: { type: mongoose.Schema.Types.ObjectId, refPath: 'modelType' },
		sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
	},
	{
		timestamps: true,
	}
)

export default mongoose.model('Message', schema)