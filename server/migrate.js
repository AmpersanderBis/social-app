#! /usr/bin/env node

import async from 'async'
import mongoose from 'mongoose'
import readline from 'readline'

import Chat from './models/Chat.js'
import Room from './models/Room.js'
import User from './models/User.js'
import Brand from './models/Brand.js'

// Get arguments and initialize variables
const args = process.argv.slice(2)
const dropped = []
const collections = ['users', 'brands', 'rooms']
const password = '$2b$10$mqv/8wKw5Kou4WdiNWCD8.BcRZgtfbGA92IFzRdw4dn5gpJPqos4K'
var seed = false
var mongoURL = process.env.DB_CONN

args.forEach(arg => {
	// If -h or --help is passed as argument then print help
	if (arg == '-h' || arg == '--help' || arg == 'help') {
		console.log('Usage: node init.js [<arg>] [...options]')
		// Subcommands
		console.log('\nArguments:')
		console.log('help				Show this help message')
		console.log('<URL>				MongoDB connection URL')
		console.log('\nExamples:')
		console.log('node init.js help')
		console.log('node init.js mongodb[+srv]://<user>:<pass>@<host>[/<db>]')
		console.log('node init.js -i coll2,coll3 -d')
		console.log('\nOptions:')
		console.log('[-h | --help]			Show this help message')
		console.log('[-o | --only] <collections>	Only load the specified comma-separated collections')
		console.log('[-i | --ignore] <collections>	Ignore the specified comma-separated collections')
		console.log('[-d | --drop] [<collections>]	Drop all or the specified comma-separated before loading')
		// if -o is passed with -i then ignore -i
		console.log('\nNote: -i is ignored if -o is passed')
		process.exit()
	}

	// If a mongodb URL is passed as argument then use it
	if (arg.startsWith('url=')) {
		mongoURL = arg.split('=')[1]

		// Regex to check if the URL scheme is valid
		const regex = /^mongodb(?:\+srv)?:\/\//

		if (!regex.test(mongoURL)) {
			console.error('Your URL should start with `mongodb://` or `mongodb+srv://`.')
			console.log('Your default URL is: ' + process.env.DB_CONN)

			const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

			// Ask user if they want to use the default URL
			rl.question('Do you want to use it? (y/n)', answer => {
				if (answer != 'y') process.exit(1)
				rl.close()
			})

			// Fallback to the default URL
			console.log(`Fallback to the default URL...`)
			mongoURL = process.env.DB_CONN
		}
	}

	// If specified, drop the collections before loading
	if (arg.startsWith('drop')) {
		const drop = arg.split('=')[1]?.split(',')
		console.log(`Dropping collections: ${drop?.join(', ') || 'all'}`)
		if (drop) drop.forEach(coll => { if (collections.includes(coll)) dropped.push(coll) })
		else dropped.push(...collections)
	}

	// If specified, load only the specified collections
	if (arg.startsWith('only=')) {
		const colls = arg.split('=')[1].split(',')
		console.log(`Only loading collections: ${colls.join(', ')}`)
		collections.forEach((coll, i) => { if (!colls.includes(coll)) delete collections[i] })
	}

	// If specified and args has no only argument, ignore the specified collections 
	if (arg.startsWith('ignore=') && args.some(arg => arg.startsWith('only='))) {
		const colls = arg.split('=')[1].split(',')
		console.log(`Ignoring collections: ${colls.join(', ')}`)
		collections.forEach((coll, i) => { if (colls.includes(coll)) delete collections[i] })
	}

	// Seed the database
	if (arg == '-s' || arg == '--seed' || arg == 'seed') {
		console.log('Seeding database...')
		seed = true
	}
})

mongoose.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = global.Promise

const { connection } = mongoose

connection.on('error', () => {
	console.error('Error connecting to MongoDB.')
	process.exit(1)
})

connection.once('open', () => {
	if (dropped.length) {
		dropped.forEach(collection => {
			connection.db.dropCollection(collection, err => {
				console.log(`Collection ${collection} ${err ? 'does not exist' : 'dropped'}.`)
			})
		})
	}
})

const Fixtures = (collections, callback = () => {}, seed = false) => {
	const data = {
		users: [],
		chats: [],
		brands: [],
		rooms: []
	}

	const user = (username, email, password, firstName, lastName, roles, rooms, following, followers, cb) => {
		const user = new User({
			username: username,
			email: email,	
			password: password,
			firstName: firstName,
			lastName: lastName,
			roles: roles,
			rooms: rooms,
			following: following,
			followers: followers
		})
	
		user.save(function (err) {
			if (err) {
				cb(err, null)
				return
			}
	
			console.log('\n' + user.username + ':' + user._id)
			data.users.push(user)
			cb(null, user)
		})
	}

	const chat = (members, cb) => {
		const chat = new Chat({ members })
	
		chat.save(function (err) {
			if (err) {
				cb(err, null)
				return
			}

			// For each member, add the room to their rooms array
			members?.forEach(member => {
				member.rooms.push(chat)
				member.updateOne({ chats: member.chats }, err => { if (err) console.log(err.message) })
			})

			data.chats.push(chat)
			cb(null, chat)
		})
	}

	const brand = (name, description, link, cb) => {
		const file = name.replace(/ /g, '-') + '.png'
		const brand = new Brand({ name, description, link, logo: `${file}`, banner: `${file}` })

		brand.save(function (err) {
			if (err) {
				cb(err, null)
				return
			}

			data.brands.push(brand)
			cb(null, brand)
		})
	}

	const room = (cb, name, description, brand, limits = 10, members = []) => {
		const room = new Room({ name, description, limits, members, brand })

		room.save(function (err) {
			if (err) {
				cb(err, null)
				return
			}

			// If the room has a brand, add the room to the brand's rooms array
			brand?.rooms.push(room)
			brand?.updateOne({ rooms: brand.rooms }, err => { if (err) console.log(err.message) })

			// For each member, add the room to their rooms array
			members?.forEach(member => {
				member.rooms.push(room)
				member.updateOne({ rooms: member.rooms }, err => { if (err) console.log(err.message) })
			})
	
			data.rooms.push(room)
			cb(null, room)
		})
	}

	const users = cb => {
		async.series([
			callback => user('root1', 'root1@root.com', password, 'Root', '1', ['staff'], [], [], [], callback),
			callback => user('root2', 'root2@root.com', password, 'Root', '2', ['staff'], [], [], [], callback),
			callback => user('root3', 'root3@root.com', password, 'Root', '3', ['user'], [], [], [], callback)
		], cb)
	}

	const chats = cb => {
		async.series([
			callback => chat([data.users[0], data.users[1]], callback),
			callback => chat([data.users[0], data.users[2]], callback),
			callback => chat([data.users[1], data.users[2]], callback)
		], cb)
	}

	const brands = cb => {
		async.series([
			callback => brand('BMW', "BMW is a company with the most extended history in the German motorcycle business. BMW started its business in 1901, and they made their first motorcycles in 1923. They kept on producing motorbikes through the entire WW1. BMW's most famous bike is a sports bike, the S1000RR. BMW is the most famous German motorcycle brand.", 'https://www.bmw-motorrad.com/', callback),
			callback => brand('Ducati', `Ducati is the most famous Italian motorcycle manufacturer. The company started manufacturing motorcycles in 1929 and is currently owned by Audi. You probably know Ducati for their V-twin engines. The two-cylinder engines complement their distinctive Italian design. Ducati produced its first motorcycle in the year 1950. The Scrambler Icon is the most popular model of this particular motorcycle brand.`, 'https://www.ducati.com/', callback),
			callback => brand('Harley Davidson', `Harley Davidson, the American pride, is the most famous American motorcycle brand that makes bikes that we all know as one of the symbols that represent the United States of America. Harley Davidson, founded in 1903, is famous for making choppers and depicts an iconic image of a biker. Most popular Harley Davidson bike is still the 1915 11F.`, 'https://www.harley-davidson.com/', callback),
			callback => brand('Honda', `Honda is a Japanese company as Well. Even though they are doing business since1946, they only started to produce motorcycles in 1955. In the year 1982, Honda manufactured almost three million vehicles which made it the most popular motorcycle brand in 1982. Most popular Honda bike is the CB500.`, 'https://powersports.honda.com/', callback),
			callback => brand('Kawasaki', `Kawasaki is a Japanese manufacturer founded in 1939. In 1963, they started to make motorcycles in addition to aircraft and other vehicles. The companies' slogan is "Let the good times roll!" And most popular Kawasaki bikes are the Ninja and the KLR. Kawasaki is one of the most popular motorcycle brands among beginner riders.`, 'https://www.kawasaki.com/', callback),
			callback => brand('Moto Guzzi', `Moto Guzzi was founded in Italy in 1921. It was once the leading company in motorcycle development and innovation. Even today they are still one of the most boutique motorcycle builders and very popular among riders. Most popular Moto Guzzi bikes are the Breva and California.`, 'https://www.motoguzzi.com/', callback),
			callback => brand('Suzuki', `Suzuki opened its doors in 1909 in Japan. However, the company did not start to make a motorcycle until 1952. It was only ten years later when they became part of motorcycling sports and still are today one of the strongest motorcycle brands in the MotoGP. Unsurprisingly, their most popular bike is the GSX-R750.`, 'https://suzukicycles.com/', callback),
			callback => brand('Triumph', `Triumph is a British Company specialized in motorcycle manufacturing from it was beginning in 1984. Even though the brand is rather young, their bikes are one of the most popular choices among caffe-racer riders. But oddly enough, the most popular Triumph motorcycle is the Tiger 800 XC, an adventure bike.`, 'https://www.triumphmotorcycles.co.uk/', callback),
			callback => brand('Victory', `Victory, an American motorcycle company, founded in 1997, tried to end the Harley domination on the American chopper market. Unfortunately, the company closed its doors after 20 years of manufacturing (y. 2017). Their most popular bike was/is Victory Vegas.`, 'https://www.victorymotorcycles.com/', callback),
			callback => brand('Yamaha', `Yamaha is another Japanese motorcycle manufacturer, founded in 1955. Right now, Yamaha is one of the leading and most recognizable motorcycle brands in the world, since they are a part of Moto GP and have Valentino Rossi racing for them. The most popular model of Yamaha motorcycles is the YZF-R6.`, 'https://www.yamahamotorsports.com/', callback)
		], cb)
	}

	const rooms = cb => {
		async.series([
			callback => room(callback, 'Main', 'Get in touch with other motorcycle enthusiasts here. Introduce yourself if you are new!', null, -1),
			callback => room(callback, 'Help', 'The staff and other members will be happy to help you with any questions you might have.', null, -1),
			callback => room(callback, 'Misc', 'Anything else that is not motorcycle related can be discussed here: lifestyle, interests...', null, 20),
			callback => room(callback, 'BMW', `BMW's main room.`, data.brands[0]),
			callback => room(callback, 'Ducati', `Ducati's main room`, data.brands[1]),
			callback => room(callback, 'Harley Davidson', `Harley Davidson's main room.`, data.brands[2]),
			callback => room(callback, 'Honda', `Honda's main room.`, data.brands[3]),
			callback => room(callback, 'Kawasaki', `Kawasaki's main room.`, data.brands[4]),
			callback => room(callback, 'Moto Guzzi', `Moto Guzzi's main room.`, data.brands[5]),
			callback => room(callback, 'Suzuki', `Suzuki's main room.`, data.brands[6]),
			callback => room(callback, 'Triumph', `Triumph's main room.`, data.brands[7]),
			callback => room(callback, 'Victory', `Victory's main room.`, data.brands[8]),
			callback => room(callback, 'Yamaha', `Yamaha's main room.`, data.brands[9])
		], cb)
	}

	const load = (seeders, callback = () => {}, seed = false) => {
		if (seed) {
			async.series(seeders, err => {
				if (err) console.log('\nError loading fixtures: ' + err)
				else {
					console.log('\n' + data.users.length + ' users')
					console.log(data.chats.length + ' chats')
					console.log(data.brands.length + ' brands')
					console.log(data.rooms.length + ' rooms')
				}
			})
		}

		setTimeout(callback, 2000)
	}

	const functions = {
		users,
		chats,
		brands,
		rooms
	}

	const seeders = collections.map(i => functions[i]).filter(i => i)

	load(seeders, callback, seed)
}

Fixtures(collections, () => connection.close(), seed)