
//Import the Express framework
const express = require('express');
//Create a router object for managing routes
const router = express.Router();

//Import a middleware for checking authentication tokens
const authTokenHandler = require('../Middlewares/checkAuthToken');
//Import a middleware for handling errors globally
const errorHandler = require('../Middlewares/errorMiddleware');
//Import the User model to interact with the database
const User = require('../Models/UserSchema');

//Define a function to create a standardized response structure
function createResponse(ok, message, data) {
    return {
        ok, 
        message, 
        data, 
    };
}

//Define a POST route for adding a workout entry, using the authentication token middleware
router.post('/addworkoutentry', authTokenHandler, async (req, res) => {
    //Destructure and extract workout data from the request body
    const { date, exercise, durationInMinutes } = req.body;

    //Validate the required data is provided
    if (!date || !exercise || !durationInMinutes) {
        //Return a 400 error with a message if validation fails
        return res.status(400).json(createResponse(false, 'Please provide date, exercise, and duration'));
    }

    //Retrieve the user ID from the request context, set by the authentication middleware
    const userId = req.userId;
    //Fetch the user document from the database by user ID
    const user = await User.findById({ _id: userId });

    //Push the new workout entry to the user's workouts array
    user.workouts.push({
        date: new Date(date), //Convert the date string to a Date object
        exercise,
        durationInMinutes,
    });

    //Save the updated user document to the database
    await user.save();
    //Respond with a success message
    res.json(createResponse(true, 'Workout entry added successfully'));
});

//Define a POST route to retrieve workout entries by a specific date
router.post('/getworkoutsbydate', authTokenHandler, async (req, res) => {
    //Extract the date from the request body
    const { date } = req.body;
    //Retrieve the user ID from the request, set by the authentication middleware
    const userId = req.userId;
    //Fetch the user from the database
    const user = await User.findById({ _id: userId });

    //If no date is provided, use today's date
    if (!date) {
        let today = new Date();
        //Filter the user's workout entries for today
        user.workouts = filterEntriesByDate(user.workouts, today);

        //Return the workouts for today
        return res.json(createResponse(true, 'Workout entries for today', user.workouts));
    }

    //Filter the workouts by the provided date
    user.workouts = filterEntriesByDate(user.workouts, new Date(date));
    //Respond with the filtered workout entries
    res.json(createResponse(true, 'Workout entries for the date', user.workouts));
});

//Define a POST route to retrieve workouts by a specified limit of days
router.post('/getworkoutsbylimit', authTokenHandler, async (req, res) => {
    //Extract the limit from the request body
    const { limit } = req.body;
    //Retrieve the user ID
    const userId = req.userId;
    //Fetch the user from the database
    const user = await User.findById({ _id: userId });

    //Validate the limit input
    if (!limit) {
        //Return a 400 error if no limit is provided
        return res.status(400).json(createResponse(false, 'Please provide limit'));
    } else if (limit === 'all') {
        //If 'all' is specified, return all workout entries
        return res.json(createResponse(true, 'All workout entries', user.workouts));
    } else {
        //Calculate the date threshold for the specified limit
        let date = new Date();
        let currentDate = new Date(date.setDate(date.getDate() - parseInt(limit))).getTime();

        //Filter workout entries based on the calculated date
        user.workouts = user.workouts.filter((item) => {
            return new Date(item.date).getTime() >= currentDate;
        });

        //Return the filtered workouts
        return res.json(createResponse(true, `Workout entries for the last ${limit} days`, user.workouts));
    }
});

//Define a DELETE route to remove a specific workout entry by date
router.delete('/deleteworkoutentry', authTokenHandler, async (req, res) => {
    //Extract the date from the request body
    const { date } = req.body;

    //Validate the date input
    if (!date) {
        //Return a 400 error if the date is not provided
        return res.status(400).json(createResponse(false, 'Please provide date'));
    }

    //Retrieve the user ID
    const userId = req.userId;
    //Fetch the user from the database
    const user = await User.findById({ _id: userId });

    //Filter out the specified workout entry
    user.workouts = user.workouts.filter(entry => entry.date !== date);

    //Save the updated user document
    await user.save();
    //Respond with a success message
    res.json(createResponse(true, 'Workout entry deleted successfully'));
});

//Define a GET route to retrieve user-specific workout goal information
router.get('/getusergoalworkout', authTokenHandler, async (req, res) => {
    //Retrieve the user ID
    const userId = req.userId;
    //Fetch the user from the database
    const user = await User.findById({ _id: userId });

    //Set workout goals based on the user's goal type
    if(user.goal == "weightLoss"){
        let goal = 7; //E.g., 7 days of workouts per week for weight loss
        res.json(createResponse(true, 'User goal workout days', { goal }));
    }
    else if(user.goal == "weightGain"){
        let goal = 4; //Fewer days, focusing on recovery
        res.json(createResponse(true, 'User goal workout days', { goal }));
    }
    else{
        let goal = 5; //Moderate goal for maintaining fitness
        res.json(createResponse(true, 'User goal workout days', { goal }));
    }

    //Respond with the workout history (additional functionality might be intended here)
    res.json(createResponse(true, 'User workout history', { workouts: user.workouts }));
});

//Attach the global error handling middleware to the router
router.use(errorHandler);

//Define a utility function to filter entries by an exact target date
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

//Export the configured router to be used in other parts of the application
module.exports = router;
