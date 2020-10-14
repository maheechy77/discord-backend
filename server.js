import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import discordSchema from "./mongoData.js";
import Pusher from "pusher";

const app = express();
const port = process.env.PORT || 9001;

const pusher = new Pusher({
	appId: "1090397",
	key: "5218136caa76256b0cf0",
	secret: "b67e7686f2008a9e2e37",
	cluster: "ap2",
	encrypted: true,
});

app.use(express.json());
app.use(cors());

const mongoURI =
	"mongodb+srv://admin:6KsSlO7FoXbN5xIp@discord-clone.59ewh.mongodb.net/discordDb?retryWrites=true&w=majority";

mongoose.connect(mongoURI, {
	useCreateIndex: true,
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

mongoose.connection.once("open", () => {
	const changeStream = mongoose.connection.collection("conversations").watch();

	changeStream.on("change", (change) => {
		if (change.operationType === "insert") {
			pusher.trigger("channels", "newChannel", {
				change: "change",
			});
		} else if (change.operationType === "update") {
			pusher.trigger("conversation", "newMessage", {
				change: "change",
			});
		} else {
			console.log("Error triggering pusher");
		}
	});
});

app.get("/", (req, res) =>
	res.status(200).send("Hello to Discord Clone Backend")
);

app.post("/new/channel", (req, res) => {
	const dbData = req.body;
	discordSchema.create(dbData, (err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(201).send(data);
		}
	});
});

app.get("/get/channelList", (req, res) => {
	discordSchema.find((err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			let channels = [];
			data.map((channelData) => {
				const channelInfo = {
					id: channelData._id,
					name: channelData.channelName,
				};
				channels.push(channelInfo);
			});
			res.status(200).send(channels);
		}
	});
});

app.post("/new/message", (req, res) => {
	const newMessage = req.body;

	discordSchema.update(
		{
			_id: req.query.id,
		},
		{
			$push: {
				conversation: req.body,
			},
		},
		(err, data) => {
			if (err) {
				res.status(500).send(err);
			} else {
				res.status(201).send(data);
			}
		}
	);
});

app.get("/get/data", (req, res) => {
	discordSchema.find((err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(200).send(data);
		}
	});
});

app.get("/get/conversation", (req, res) => {
	const id = req.query.id;
	discordSchema.find({ _id: id }, (err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(200).send(data);
		}
	});
});

app.listen(port, () => console.log(`Server running on port - ${port}`));
