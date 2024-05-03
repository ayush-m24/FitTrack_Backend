//Load the Express module
const express = require('express');
//Create a router object for defining API endpoints
const router = express.Router();

//Import middleware to verify authentication tokens
const authTokenHandler = require('../Middlewares/checkAuthToken');
//Import middleware for global error handling
const errorHandler = require('../Middlewares/errorMiddleware');
//Import the User model for database interactions
const User = require('../Models/UserSchema');

//Define a function to standardize API response formats
function createResponse(ok, message, data) {
    return {
        ok,        //Boolean indicating if the request was successful
        message,   //A message describing the outcome
        data,      //Any data returned by the endpoint
    };
}

//Define a POST endpoint to add a weight entry for a user
router.post('/addweightentry', authTokenHandler, async (req, res) => {
    //Extract date and weight from the request body
    const { date, weightInKg } = req.body;

    //Validate required input
    if (!date || !weightInKg) {
        //Return a 400 error if any required field is missing
        return res.status(400).json(createResponse(false, 'Please provide date and weight'));
    }

    //Retrieve user ID from request context, set by authTokenHandler
    const userId = req.userId;
    //Fetch the user from the database by their ID
    const user = await User.findById({ _id: userId });

    //Add the new weight entry to the user's weight array
    user.weight.push({
        date: new Date(date), //Ensure date is stored as a Date object
        weight: weightInKg,
    });

    //Save changes to the database
    await user.save();
    //Respond with success message
    res.json(createResponse(true, 'Weight entry added successfully'));
});

//Define a POST endpoint to retrieve weight entries by specific date
router.post('/getweightbydate', authTokenHandler, async (req, res) => {
    //Extract date from request body
    const { date } = req.body;
    //Retrieve the user ID from the request
    const userId = req.userId;
    //Fetch user from the database
    const user = await User.findById({ _id: userId });

    //Default to today's date if no date is provided
    if (!date) {
        let today = new Date();
        //Filter the user's weight entries for today
        user.weight = filterEntriesByDate(user.weight, today);

        //Return weight entries for today
        return res.json(createResponse(true, 'Weight entries for today', user.weight));
    }

    //Filter weight entries by provided date
    user.weight = filterEntriesByDate(user.weight, new Date(date));
    //Return filtered weight entries
    res.json(createResponse(true, 'Weight entries for the date', user.weight));
});

//Define a POST endpoint to retrieve weight entries by a given limit of days
router.post('/getweightbylimit', authTokenHandler, async (req, res) => {
    //Extract limit from request body
    const { limit } = req.body;
    //Retrieve user ID
    const userId = req.userId;
    //Fetch user from database
    const user = await User.findById({ _id: userId });

    //Validate limit input
    if (!limit) {
        //Return an error if limit is not provided
        return res.status(400).json(createResponse(false, 'Please provide limit'));
    } else if (limit === 'all') {
        //Return all weight entries if 'all' is specified
        return res.json(createResponse(true, 'All weight entries', user.weight));
    } else {
        //Calculate date for the specified limit
        let date = new Date();
        let currentDate = new Date(date.setDate(date.getDate() - parseInt(limit))).getTime();

        //Filter weight entries based on calculated date
        user.weight = user.weight.filter((item) => {
            return new Date(item.date).getTime() >= currentDate;
        });

        //Return filtered weight entries
        return res.json(createResponse(true, `Weight entries for the last ${limit} days`, user.weight));
    }
});

//Define a DELETE endpoint to remove a specific weight entry
router.delete('/deleteweightentry', authTokenHandler, async (req, res) => {
    //Extract date from request body
    const { date } = req.body;

    //Validate date input
    if (!date) {
        //Return an error if date is not provided
        return res.status(400).json(createResponse(false, 'Please provide date'));
    }

    //Retrieve user ID
    const userId = req.userId;
    //Fetch user from database
    const user = await User.findById({ _id: userId });

    //Filter out the specific weight entry
    user.weight = user.weight.filter(entry => entry.date !== date);

    //Save changes to the database
    await user.save();
    //Return success message
    res.json(createResponse(true, 'Weight entry deleted successfully'));
});

//Define a GET endpoint to provide user-specific weight goal information
router.get('/getusergoalweight', authTokenHandler, async (req, res) => {
    //Retrieve user ID
    const userId = req.userId;
    //Fetch user from database
    const user = await User.findById({ _id: userId });

    //Calculate current and goal weight based on user profile
    const currentWeight = user.weight.length > 0 ? user.weight[user.weight.length - 1].weight : null;
    const goalWeight = 22 * ((user.height[user.height.length - 1].height / 100) ** 2); //22 is the recommended BMI for a healthy person. Falls under the healthy weight range

    //Return weight goal information
    res.json(createResponse(true, 'User goal weight information', { currentWeight, goalWeight }));
});

//Attach the error handling middleware to the router
router.use(errorHandler);

//Define a utility function to filter entries by an exact date
function filterEntriesByDate(entries, targetDate) {
    return entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return (
            entryDate.getDate() === targetDate.getDate() &&
            entryDate.getMonth() === targetDate.getMonth() &&
            entryDate.getFullYear() === targetDate.getFullYear()
        );
    });
}

//Export the configured router
module.exports = router;
