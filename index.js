const express = require('express');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


// middlewares
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://volunteer-avenue.web.app',
        'https://volunteer-avenue.firebaseapp.com'
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded;
        if (req.query?.email !== req.user.email) {
            console.log('Error')
            return res.status(403).send({ message: 'forbidden access' });
        }
        next();
    })
}

const uri = `mongodb+srv://${process.env.userDB}:${process.env.password}@cluster0.rfr5aqt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const cookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    secure: process.env.NODE_ENV === "production" ? true : false,
};

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        const volunteerCollection = client.db("volunteerDB").collection("volunteerCollection");
        const beVolunteerCollection = client.db("volunteerDB").collection("BeVolunteerCollection");


        // Authentication related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.cookie('token', token, cookieOptions).send({ success: true });
        })

        app.post('/log-out', async (req, res) => {
            const user = req.body;
            res.clearCookie('token', { ...cookieOptions, maxAge: 0 })
            .send({ success: true });
        })



        // My volunteer request
        app.get('/my-volunteer-request', verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await beVolunteerCollection.find(query).toArray();
            res.send(result);
        })

        // Cancel my request
        app.delete('/my-volunteer-request/:id', verifyToken, async (req, res) => {
            const id = req.params;
            const query = { _id: new ObjectId(id) };
            const result = await beVolunteerCollection.deleteOne(query);
            res.send(result);
        })

        // Be a volunteer collection
        app.post('/be-volunteer', verifyToken, async (req, res) => {
            const data = req.body;
            const result = await beVolunteerCollection.insertOne(data);
            res.send(result);
        })


        // single volunteer details
        app.get('/volunteer-details/:id', async (req, res) => {
            const id = req.params;
            const query = { _id: new ObjectId(id) };
            const result = await volunteerCollection.findOne(query);
            res.send(result)
        })


        // volunteer collection
        app.get('/need-volunteer-section', async (req, res) => {
            const result = await volunteerCollection.find().toArray();
            res.send(result);
        })

        // Delete a volunteer
        app.delete('/need-volunteer/:id', verifyToken, async (req, res) => {
            const id = req.params;
            const query = { _id: new ObjectId(id) };
            const result = await volunteerCollection.deleteOne(query);
            res.send(result);
        })

        // My need volunteer section
        app.get('/my-need-vol', verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await volunteerCollection.find(query).toArray();
            res.send(result);
        })

        // Update Volunteer
        app.patch('/update-volunteer/:id', verifyToken, async (req, res) => {
            const id = req.params;
            const data = req.body;
            const query = { _id: new ObjectId(id) }
            const updatedData = {
                $set: {
                    date: data.date,
                    thumbnail: data.thumbnail,
                    postTitle: data.postTitle,
                    description: data.description,
                    category: data.category,
                    location: data.location,
                    volunteerNumber: data.volunteerNumber,
                }
            }
            const result = await volunteerCollection.updateOne(query, updatedData);
            res.send(result);

        })

        // search volunteer
        app.get('/need-volunteer', async (req, res) => {
            const searchName = req.query.search;
            const query = { postTitle: searchName }
            const result = await volunteerCollection.find(query).toArray();
            res.send(result);

        })



        app.post('/add-volunteer', verifyToken, async (req, res) => {
            const volunteer = req.body;
            const result = await volunteerCollection.insertOne(volunteer);
            res.send(result);
        })





        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send("App is running");
})

app.listen(port, () => {
    console.log(`App is listening on ${port}`);
});



