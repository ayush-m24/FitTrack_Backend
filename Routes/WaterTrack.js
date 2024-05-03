//Import the Express framework and create a router for handling API routes
const express = require('express');
const router = express.Router();

//Import middleware for checking authentication tokens
const authTokenHandler = require('../Middlewares/checkAuthToken');
//Import error handling middleware to manage errors across the application
const errorHandler = require('../Middlewares/errorMiddleware');
//Import the User schema to interact with the User collection in MongoDB
const User = require('../Models/UserSchema');

//Define a function to standardize the structure of API responses
function createResponse(ok, message, data) {
    return {
        ok,        //Boolean status of the operation
        message,   //Description or result message
        data,      //Data payload if any
    };
}

//POST route to add a water entry for a user
router.post('/addwaterentry', authTokenHandler, async (req, res) => {
    //Destructure date and water amount in milliliters from the request body
    const { date, amountInMilliliters } = req.body;

    //Validate that both date and water amount are provided
    if (!date || !amountInMilliliters) {
        //Respond with a 400 error if any are missing
        return res.status(400).json(createResponse(false, 'Please provide date and water amount'));
    }

    //Retrieve the user ID from the request, set by the authTokenHandler
    const userId = req.userId;
    //Find the user by their ID in the database
    const user = await User.findById({ _id: userId });

    //Add the new water entry to the user's water array
    user.water.push({
        date: new Date(date), //Ensure the date is in proper format
        amountInMilliliters,
    });

    //Save the updated user document to the database
    await user.save();
    //Respond with success message
    res.json(createResponse(true, 'Water entry added successfully'));
});

//POST route to get water entries by a specific date
router.post('/getwaterbydate', authTokenHandler, async (req, res) => {
    //Extract the date from the request body
    const { date } = req.body;
    //Retrieve the user ID from the request, authenticated by the token
    const userId = req.userId;
    //Find the user in the database
    const user = await User.findById({ _id: userId });

    //If no date is provided, use today's date
    if (!date) {
        let today = new Date();
        //Filter the water entries by today's date
        user.water = filterEntriesByDate(user.water, today);

        //Return today's water entries
        return res.json(createResponse(true, 'Water entries for today', user.water));
    }

    //Filter the water entries by the provided date
    user.water = filterEntriesByDate(user.water, new Date(date));
    //Return the filtered water entries
    res.json(createResponse(true, 'Water entries for the date', user.water));
});

//POST route to retrieve water entries for the past 'limit' days or all entries
router.post('/getwaterbylimit', authTokenHandler, async (req, res) => {
    //Extract the limit from the request body
    const { limit } = req.body;
    //Retrieve the user ID from the request
    const userId = req.userId;
    //Find the user by ID in the database
    const user = await User.findById({ _id: userId });

    //Check if limit is provided
    if (!limit) {
        //If not provided, return a 400 error
        return res.status(400).json(createResponse(false, 'Please provide limit'));
    } else if (limit === 'all') {
        //If 'all' is specified, return all water entries
        return res.json(createResponse(true, 'All water entries', user.water));
    } else {
        //Calculate the date limit for filtering water entries
        let date = new Date();
        let currentDate = new Date(date.setDate(date.getDate() - parseInt(limit))).getTime();

        //Filter water entries that fall within the specified date limit
        user.water = user.water.filter((item) => {
            return new Date(item.date).getTime() >= currentDate;
        });

        //Return the filtered water entries
        return res.json(createResponse(true, `Water entries for the last ${limit} days`, user.water));
    }
});

//DELETE route to remove a specific water entry by date
router.delete('/deletewaterentry', authTokenHandler, async (req, res) => {
    //Extract the date for which to delete the water entry
    const { date } = req.body;

    //Validate that date is provided
    if (!date) {
        //Return error if date is missing
        return res.status(400).json(createResponse(false, 'Please provide date'));
    }

    //Retrieve the user ID from the request
    const userId = req.userId;
    //Find the user in the database
    const user = await User.findById({ _id: userId });

    //Filter out the water entry for the given date
    user.water = user.water.filter(entry => entry.date !== date);

    //Save the updated user document
    await user.save();
    //Return success message
    res.json(createResponse(true, 'Water entry deleted successfully'));
});

//GET route to retrieve user-specific water goal information
router.get('/getusergoalwater', authTokenHandler, async (req, res) => {
    //Retrieve the user ID from the request
    const userId = req.userId;
    //Find the user by their ID in the database
    const user = await User.findById({ _id: userId });

    //Set a specific water intake goal in milliliters (can be customized based on user data)
    const goalWater = 4000; 

    //Return the user's water goal information
    res.json(createResponse(true, 'User max water information', {goalWater }));
});

//Attach the errorHandler to handle any errors in the routes
router.use(errorHandler);

//Define a utility function to filter entries based on a specific target date
function filterEntriesByDate(entries, targetDate) {
    //Filter entries to include only those that match the exact target date
    return entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return (
            entryDate.getDate() === targetDate.getDate() &&
            entryDate.getMonth() === targetDate.getMonth() &&
            entryDate.getFullYear() === targetDate.getFullYear()
        );
    });
}

//Export the router module for use in other parts of the application
module.exports = router;
