//Import the Express framework to set up the server and routing
const express = require('express');
//Initialize a new Router object to define routes
const router = express.Router();
//Load environment variables from the .env file
require('dotenv').config();
//Import Cloudinary library configured for version 2
const cloudinary = require('cloudinary').v2;
//Import multer for handling multipart/form-data (primarily used for uploading files)
const multer = require('multer');

//Import sharp for image processing. Used to decrease the size of the image.
const sharp = require('sharp');

//Configure Cloudinary with credentials from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, //Cloudinary account cloud name
    api_key: process.env.CLOUDINARY_API_KEY,       //Cloudinary account API key
    api_secret: process.env.CLOUDINARY_API_SECRET  //Cloudinary account API secret
});

//Set up multer to use memory storage (stores files in memory as Buffer objects)
const storage = multer.memoryStorage();
//Create a multer instance specifying the storage option
const upload = multer({ storage });

//Define a POST route to handle image uploads
router.post('/uploadimage', upload.single('myimage'), async (req, res) => {
    //Access the uploaded file from the request object
    const file = req.file;
    //If no file is provided in the request, return an error
    if (!file) {
        return res.status(400).json({ ok: false, error: 'No image file provided' });
    }

    //Use sharp to process the image
    sharp(file.buffer)  //Use the buffer from the uploaded file
        .resize({ width: 800 })  //Resize the image to a width of 800 pixels
        .toBuffer(async (err, data, info) => {  //Convert the processed image back to a Buffer
            if (err) {  //If there is an error during processing
                console.error('Image processing error:', err);
                return res.status(500).json({ ok: false, error: 'Error processing image' });
            }

            //Use Cloudinary's uploader to upload the image
            cloudinary.uploader.upload_stream({ resource_type: 'auto' }, async (error, result) => {
                if (error) {  //If there is an error during upload
                    console.error('Cloudinary Upload Error:', error);
                    return res.status(500).json({ ok: false, error: 'Error uploading image to Cloudinary' });
                }

                //If the upload is successful, respond with the image URL
                res.json({ ok: true, imageUrl: result.url, message: 'Image uploaded successfully' });
            }).end(data);  //End the stream with the processed image data
        })
});

//Export the router so it can be used by other parts of the application
module.exports = router;
