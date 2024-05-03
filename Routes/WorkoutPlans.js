
//Import the Express library for creating server applications
const express = require('express');
//Initialize a router object to define routes
const router = express.Router();

//Import a custom error handling middleware for managing errors across the application
const errorHandler = require('../Middlewares/errorMiddleware');
//Import middleware for checking and validating admin tokens
const adminTokenHandler = require('../Middlewares/checkAdminToken');
//Import the User schema/model for database interactions (not used in the given routes)
const User = require('../Models/UserSchema');
//Import the Workout schema/model for handling workout data in the database
const Workout = require('../Models/WorkoutSchema');

//Define a function to standardize the structure of API responses
function createResponse(ok, message, data) {
    return {
        ok,        //Boolean indicating the success or failure of the operation
        message,   //Descriptive message about the operation
        data,      //Data payload of the response
    };
}

//Define a POST route for creating new workouts, secured with admin token middleware
router.post('/workouts', adminTokenHandler , async (req, res) => {
    try {
        
        // name: {
        //     type: String,
        //     required: true,
        // },
        // description: {
        //     type: String,
        //     required: true,
        // },
        // durationInMinutes: {
        //     type: Number,
        //     required: true,
        // },
        // exercises: [
        //     {
        //         name: {
        //             type: String,
        //             required: true,
        //         },
        //         description: {
        //             type: String,
        //             required: true,
        //         },
        //         sets: {
        //             type: Number,
        //             required: true,
        //         },
        //         reps: {
        //             type: Number,
        //             required: true,
        //         },
        //         imageURL: {
        //             type: String,
        //             required: true,
        //         },
        //     }
        // ],
        // imageURL: {
        //     type: String,
        //     required: true,
        // },

        //Destructure necessary fields from the request body
        const { name, description, durationInMinutes, exercises, imageURL } = req.body;
        //Create a new workout document with the provided data
        const workout = new Workout({
            name,
            description,
            durationInMinutes,
            exercises,
            imageURL,
        });

        //Save the workout document to the database
        await workout.save();
        //Respond with a success message and the saved workout data
        res.json(createResponse(true, 'Workout created successfully', workout));
    } catch (err) {
        //If an error occurs, respond with the error message
        res.json(createResponse(false, err.message));
    }
});

//Define a GET route to fetch all workouts
router.get('/workouts', async (req, res) => {
    try {
        //Fetch all workout documents from the database
        const workouts = await Workout.find({});
        //Respond with all fetched workouts
        res.json(createResponse(true, 'Workouts fetched successfully', workouts));
    } catch (err) {
        //If an error occurs, respond with the error message
        res.json(createResponse(false, err.message));
    }
});

//Define a GET route to fetch a specific workout by ID
router.get('/workouts/:id', async (req, res) => {
    try {
        //Fetch a single workout by its ID from the database
        const workout = await Workout.findById(req.params.id);
        //Respond with the fetched workout
        res.json(createResponse(true, 'Workout fetched successfully', workout));
    } catch (err) {
        //If an error occurs, respond with the error message
        res.json(createResponse(false, err.message));
    }
});

//Define a PUT route to update a workout by ID, secured with admin token middleware
router.put('/workouts/:id', adminTokenHandler , async (req, res) => {
    try {
        //Fetch the workout to be updated from the database by ID
        const workout = await Workout.findById(req.params.id);
        //Update the workout with new data from the request body
        const { name, description, durationInMinutes, exercises, imageURL } = req.body;
        workout.name = name;
        workout.description = description;
        workout.durationInMinutes = durationInMinutes;
        workout.exercises = exercises;
        workout.imageURL = imageURL;

        //Save the updated workout to the database
        await workout.save();
        //Respond with the updated workout data
        res.json(createResponse(true, 'Workout updated successfully', workout));
    } catch (err) {
        //If an error occurs, respond with the error message
        res.json(createResponse(false, err.message));
    }
});

//Define a DELETE route to remove a workout by ID, secured with admin token middleware
router.delete('/workouts/:id', adminTokenHandler , async (req, res) => {
    try {
        //Fetch the workout to be deleted from the database by ID
        const workout = await Workout.findById(req.params.id);
        //Remove the workout from the database
        await workout.remove();
        //Respond with a success message
        res.json(createResponse(true, 'Workout deleted successfully'));
    } catch (err) {
        //If an error occurs, respond with the error message
        res.json(createResponse(false, err.message));
    }
});

//Attach the global error handling middleware to the router
router.use(errorHandler);

//Export the configured router for use in other parts of the application
module.exports = router;
