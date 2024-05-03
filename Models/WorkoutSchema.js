const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

//The create access is only for the workout 
const workoutSchema = new mongoose.Schema({

    name: { //Workout name
        type: String,
        required: true,
    },

    description: {
        type: String,
        required: true,
    },

    durationInMinutes: {
        type: Number,
        required: true,
    },

    exercises: [
        {
            name: {
                type: String,
                required: true,
            },
            description: {
                type: String,
                required: true,
            },
            sets: {
                type: Number,
                required: true,
            },
            reps: {
                type: Number,
                required: true,
            },
            imageURL: {  //The gif url (the path used)
                type: String,
                required: true,
            },
        }
    ],
    imageURL: { //The images used in the banner sliders on home page 
        type: String,
        required: true,
    },
}, {
    timestamps: true
})




const Workout = mongoose.model('Workout', workoutSchema);
module.exports = Workout;