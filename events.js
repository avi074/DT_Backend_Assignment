import { ObjectId } from "mongodb";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Router } from "express";

// Configure multer storage options
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads"); // Save files to the 'uploads' folder
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname); // Get the file extension
    const filename = Date.now() + fileExtension; // Create a unique filename
    cb(null, filename);
  },
});

// Initialize multer with storage configuration
const upload = multer({ storage: storage });

// Ensure 'uploads' directory exists (create it if it doesn't)
const dir = "./uploads";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

/**
 * 
 * @param {import('mongodb').Collection} collection 
 * @returns {import('express').Router}
 */
export default function getEventRouter(collection) {
  // Events Routing
  const eventRouter = Router();

  eventRouter.get("/events", (req, res) => {
    const { id, type, limit = 10, page = 1 } = req.query;

    // If ID is provided as a query parameter
    if (id) {
      // Validate ObjectId format
      if (!ObjectId.isValid(id.toString())) {
        return res.status(400).send("Invalid ID format");
      }

      // Fetch the document by ID
      collection
        .findOne({ _id: new ObjectId(id.toString()) })
        .then((event) => {
          if (!event) {
            return res.status(404).send("event not found");
          }
          res.status(200).send(event);
        })
        .catch((err) => {
          res.status(500).send(`Error fetching event: ${err}`);
        });
    }
    // Handle case where no ID is provided, perform filtering and pagination
    else {
      // Validate pagination parameters
      const parsedLimit = parseInt(limit.toString());
      const parsedPage = parseInt(page.toString());

      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).send("Invalid limit");
      }

      if (isNaN(parsedPage) || parsedPage <= 0) {
        return res.status(400).send("Invalid page");
      }

      const skip = (parsedPage - 1) * parsedLimit;
      const query = type ? { type } : {}; // If 'type' is provided, filter by type

      // Fetch the documents with pagination and filtering by 'type'
      collection
        .find(query)
        .skip(skip)
        .limit(parsedLimit)
        .toArray()
        .then((events) => {
          res.status(200).send(events);
        })
        .catch((err) => {
          res.status(500).send(`Error fetching events: ${err}`);
        });
    }
  });

  eventRouter.post("/events", upload.single("files[image]"), (req, res) => {
    const image = req.file;

    // Validate file upload
    // if (!image) {
    //   return res.status(400).send("No image file uploaded");
    // }

    collection
      .insertOne({
        ...req.body,
        //   "files[image]": image.path,
      })
      .then((result) => {
        res.status(201).send({
          message: "event inserted successfully",
          eventId: result.insertedId,
        });
      })
      .catch((err) => {
        res.status(500).send(`Error inserting event: ${err}`);
      });
  });

  eventRouter.put("/events/:id", upload.single("files[image]"), (req, res) => {
    const { id } = req.params;
    const image = req.file;

    if (!ObjectId.isValid(id.toString())) {
      return res.status(400).send("Invalid ID format");
    }

    const updateData = {
      ...req.body,
    };

    // Only update the image if it's uploaded
    if (image) {
      updateData["files[image]"] = image.path;
    }

    // Find the document by ID and update it (or insert if not found using upsert)
    collection
      .findOneAndUpdate(
        { _id: new ObjectId(id.toString()) },
        { $set: updateData },
        { returnDocument: "after" },
      )
      .then((result) => {
        if (!result) {
          return res.status(404).send("event not found");
        }
        res.status(200).send({
          message: "event updated successfully",
          event: result,
        });
      })
      .catch((err) => {
        res.status(500).send(`Error updating event: ${err}`);
      });
  });

  eventRouter.delete("/events/:id", (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id.toString())) {
      return res.status(400).send("Invalid ID format");
    }

    collection
      .findOneAndDelete({ _id: new ObjectId(id.toString()) })
      .then((result) => {
        if (!result) {
          return res.status(404).send("event not found");
        }
        res
          .status(200)
          .send({ message: "event deleted successfully", event: result });
      })
      .catch((err) => {
        res.status(500).send(`Error deleting event: ${err}`);
      });
  });

  return eventRouter;
}
