const express = require('express');
const app = express();

//Import the body-parser module for parsing incoming request bodies
const bodyParser = require('body-parser');
//Import the cors module to enable Cross-Origin Resource Sharing
const cors = require('cors');
//The port number on which the server will listen
const PORT = 8000;
//Import the cookie-parser module for parsing cookies attached to the client request object
const cookieParser = require('cookie-parser');

const authRoutes = require('./Routes/Auth');
const calorieIntakeRoutes = require('./Routes/CalorieIntake');
const adminRoutes = require('./Routes/Admin');
const imageUploadRoutes = require('./Routes/imageUploadRoutes');
const sleepTrackRoutes = require('./Routes/SleepTrack');
const stepTrackRoutes = require('./Routes/StepTrack');
const weightTrackRoutes = require('./Routes/WeightTrack');
const waterTrackRoutes = require('./Routes/WaterTrack');
const workoutTrackRoutes = require('./Routes/WorkoutTrack');
const workoutRoutes = require('./Routes/WorkoutPlans');
const reportRoutes = require('./Routes/Report'); 

//Import and configure environment variables from the .env file
require('dotenv').config();
//Establish a connection to the database by importing the database configuration
require('./db')

//Apply bodyParser middleware to parse JSON bodies
app.use(bodyParser.json());
const allowedOrigins = ['http://localhost:3000', 'https://fittrack-zeta.vercel.app']; //Frontend is in "http://localhost:3000". Allow access to backend running on localhost8000.

app.use(
    cors({ //Ensure safety by restricting access to the backend
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) { //Allowed urls will be given access
                callback(null, true);
            } else {  //Block requests from disallowed origins and respond with an error
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true, // Allow credentials
        methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
    })
);
//For storing cookies. (Auth token, refresh token) Cookie parser intitialized to recognize cookies.
app.use(cookieParser()); 


app.use('/auth', authRoutes);
app.use('/calorieintake', calorieIntakeRoutes);
app.use('/admin', adminRoutes);
app.use('/image-upload', imageUploadRoutes);
app.use('/sleeptrack', sleepTrackRoutes);
app.use('/steptrack', stepTrackRoutes);
app.use('/weighttrack', weightTrackRoutes);
app.use('/watertrack', waterTrackRoutes);
app.use('/workouttrack', workoutTrackRoutes);
app.use('/workoutplans', workoutRoutes);
app.use('/report', reportRoutes); 

//rRoute for the root path that sends a JSON response
app.get('/', (req, res) => {
    res.json({ message: 'The API is working' });
});

//Start the server and listen on the defined port, logging a message upon start-up in the console
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});