//Import the Express library
const express = require('express');
//Create a router object for defining routes
const router = express.Router();

//Import middleware to verify authentication tokens
const authTokenHandler = require('../Middlewares/checkAuthToken');
//Import middleware to handle errors
const errorHandler = require('../Middlewares/errorMiddleware');
//Import the User schema to interact with the User collection in MongoDB
const User = require('../Models/UserSchema');

//Define a function to standardize response structure
function createResponse(ok, message, data) {
    return {
        ok, 
        message, 
        data, 
    };
}

//Route to add a step entry for a user
router.post('/addstepentry', authTokenHandler, async (req, res) => {
    //Extract date and steps from the request body
    const { date, steps } = req.body;

    //Check if both date and steps are provided
    if (!date || !steps) {
        //Respond with a 400 error if any are missing
        return res.status(400).json(createResponse(false, 'Please provide date and steps count'));
    }

    //Retrieve the user ID from the request, set by the authTokenHandler
    const userId = req.userId;
    //Find the user by their ID in the database
    const user = await User.findById({ _id: userId });

    //Add the new steps entry to the user's steps array
    user.steps.push({
        date: new Date(date), //Ensure the date is in proper format
        steps,
    });

    //Save the updated user document to the database
    await user.save();
    //Respond with success message
    res.json(createResponse(true, 'Steps entry added successfully'));
});

//Route to get steps by a specific date
router.post('/getstepsbydate', authTokenHandler, async (req, res) => {
    //Extract the date from the request body
    const { date } = req.body;
    //Retrieve the user ID from the request, authenticated by the token
    const userId = req.userId;
    //Find the user in the database
    const user = await User.findById({ _id: userId });

    //If no date is provided, use today's date
    if (!date) {
        let today = new Date();
        //Filter the steps by today's date
        user.steps = filterEntriesByDate(user.steps, today);

        //Return today's step entries
        return res.json(createResponse(true, 'Steps entries for today', user.steps));
    }

    //Filter the steps by the provided date
    user.steps = filterEntriesByDate(user.steps, new Date(date));
    //Return the filtered step entries
    res.json(createResponse(true, 'Steps entries for the date', user.steps));
});

//Route to get steps by a limit (e.g., last X days)
router.post('/getstepsbylimit', authTokenHandler, async (req, res) => {
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
        //If 'all' is specified, return all step entries
        return res.json(createResponse(true, 'All steps entries', user.steps));
    } else {
        //Calculate the date limit for filtering step entries
        let date = new Date();
        let currentDate = new Date(date.setDate(date.getDate() - parseInt(limit))).getTime();

        //Filter steps entries that fall within the specified date limit
        user.steps = user.steps.filter((item) => {
            return new Date(item.date).getTime() >= currentDate;
        });

        //Return the filtered steps entries
        return res.json(createResponse(true, `Steps entries for the last ${limit} days`, user.steps));
    }
});

//Route to delete a specific step entry by date
router.delete('/deletestepentry', authTokenHandler, async (req, res) => {
    //Extract the date for which to delete the step entry
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

    //Filter out the step entry for the given date
    user.steps = user.steps.filter(entry => entry.date !== date);

    //Save the updated user document
    await user.save();
    //Return success message
    res.json(createResponse(true, 'Steps entry deleted successfully'));
});

//Route to get user's step goal based on their goal setting
router.get('/getusergoalsteps', authTokenHandler, async (req, res) => {
    //Retrieve the user ID from the request
    const userId = req.userId;
    //Find the user by their ID in the database
    const user = await User.findById({ _id: userId });

    //Set a default steps goal
    let totalSteps = 0;

    //Set step goals based on the user's specified goal for weight management
    if(user.goal == "weightLoss"){
        totalSteps = 10000; //Higher step goal for weight loss
    }
    else if(user.goal == "weightGain"){
        totalSteps = 5000; //Lower step goal for weight gain
    }
    else{
        totalSteps = 7500; //Default step goal
    }   

    //Return the user's step goal information
    res.json(createResponse(true, 'User steps information', { totalSteps }));
});

//Apply the error handling middleware to the router
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
