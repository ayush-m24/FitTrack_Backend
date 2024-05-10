//Import the Express framework and create a router for handling API routes
const express = require('express');
const router = express.Router();

//Import middleware for checking authentication tokens
const authTokenHandler = require('../Middlewares/checkAuthToken');
//Import error handling middleware to manage errors across the application
const errorHandler = require('../Middlewares/errorMiddleware');
//Import the User model schema to interact with the User collection in the database
const User = require('../Models/UserSchema');

//Define a utility function to standardize the structure of API responses
function createResponse(ok, message, data) {
    return {
        ok,        
        message,   
        data,      
    };
}

//POST route to add a sleep entry for a user
router.post('/addsleepentry', authTokenHandler, async (req, res) => {
    //Destructure date and sleep duration from the request body
    const { date, durationInHrs } = req.body;

    //Validate that both date and duration are provided
    if (!date || !durationInHrs) {
        //Respond with an error if either is missing
        return res.status(400).json(createResponse(false, 'Please provide date and sleep duration'));
    }

    //Extract the user ID set by the authTokenHandler middleware
    const userId = req.userId;
    //Retrieve the user document from the database
    const user = await User.findById({ _id: userId });

    //Add the new sleep entry to the user's sleep array
    user.sleep.push({
        date: new Date(date),       //Convert the string date to a Date object
        durationInHrs,              //Store the sleep duration in hours
    });

    //Save the updated user document
    await user.save();
    //Respond with success message
    res.json(createResponse(true, 'Sleep entry added successfully'));
});

//POST route to retrieve sleep entries by a specific date
router.post('/getsleepbydate', authTokenHandler, async (req, res) => {
    const { date } = req.body; //Extract date from request body
    const userId = req.userId; //Extract the user ID from request after authentication

    const user = await User.findById({ _id: userId }); //Retrieve the user document

    if (!date) { //If no date is provided, assume today's date
        let today = new Date();
        user.sleep = filterEntriesByDate(user.sleep, today); //Filter sleep entries for today

        return res.json(createResponse(true, 'Sleep entries for today', user.sleep));
    }

    //Filter sleep entries for the provided date
    user.sleep = filterEntriesByDate(user.sleep, new Date(date));
    res.json(createResponse(true, 'Sleep entries for the date', user.sleep));
});

//POST route to retrieve sleep entries for the past 'limit' days or all entries
router.post('/getsleepbylimit', authTokenHandler, async (req, res) => {
    const { limit } = req.body;  //Extract the limit from the request body
    const userId = req.userId;   //Get the user ID from the request

    const user = await User.findById({ _id: userId }); //Find the user by ID

    if (!limit) { //Check if limit is not provided
        return res.status(400).json(createResponse(false, 'Please provide limit'));
    } else if (limit === 'all') { //If limit is 'all', return all sleep entries
        return res.json(createResponse(true, 'All sleep entries', user.sleep));
    } else { //Calculate the date for the given limit of days
        let date = new Date();
        let pastDateLimit = new Date(date.setDate(date.getDate() - parseInt(limit))).getTime();

        //Filter sleep entries that are within the 'limit' days
        user.sleep = user.sleep.filter((entry) => {
            return new Date(entry.date).getTime() >= pastDateLimit;
        });

        return res.json(createResponse(true, `Sleep entries for the last ${limit} days`, user.sleep));
    }
});

// DELETE route to remove a specific sleep entry based on the date provided
router.delete('/deletesleepentry', authTokenHandler, async (req, res) => {
    const { date } = req.body; // Extract the date from the request body as a string

    if (!date) { // Ensure that date is provided
        return res.status(400).json(createResponse(false, 'Please provide date'));
    }

    const userId = req.userId; // Extract user ID from the request
    const user = await User.findById({ _id: userId }); // Find user by ID

    // Convert provided date string to Date object
    const providedDate = new Date(date);

    // Filter out the sleep entry for the given date
    user.sleep = user.sleep.filter(entry => {
        return entry.date.toString() !== providedDate.toString();
    });

    await user.save(); // Save the updated user document
    res.json(createResponse(true, 'Sleep entry deleted successfully'));
});



//GET route to retrieve user-specific sleep goal information
router.get('/getusersleep', authTokenHandler, async (req, res) => {
    const userId = req.userId; //Extract user ID from the request
    const user = await User.findById({ _id: userId }); // Find user by ID

    const goalSleep = 8; //Define a static goal for sleep duration

    res.json(createResponse(true, 'User max sleep information', {goalSleep }));
});

//Attach the errorHandler to handle any errors in the routes
router.use(errorHandler);

//Utility function to filter entries by an exact date
function filterEntriesByDate(entries, targetDate) {
    return entries.filter(entry => {
        const entryDate = new Date(entry.date); //Convert each entry date to a Date object
        return ( //Compare day, month, and year to filter entries for the exact date
            entryDate.getDate() === targetDate.getDate() &&
            entryDate.getMonth() === targetDate.getMonth() &&
            entryDate.getFullYear() === targetDate.getFullYear()
        );
    });
}

//Export the configured router
module.exports = router;
