import mongoose from 'mongoose'

const schema = mongoose.Schema(
	{
		avatar: { type: String, default: 'default.png' },
		banner: { type: String, default: 'default.png' },
		username: { type: String, unique: true },
		email: { type: String, unique: true },
		password: String,
		firstName: String,
		lastName: String,
		lastSeen: { type: Date, default: Date.now() },
		token: { type: String, default: ''},
		roles: { type: Array, default: ['user'] },
		chats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chat', default: [] }],
		rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: [] }],
		following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
		followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }]
	},
	{
		timestamps: true,
		// toJSON: { virtuals: true },
		// toObject: { virtuals: true }
	}
)

schema.virtual('fullName').get(() => { return this.firstName + ' ' + this.lastName })
schema.virtual('isStaff').get(() => { return this.roles.includes('staff') })

export default mongoose.model('User', schema)