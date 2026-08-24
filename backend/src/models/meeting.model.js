import mongoose, {Schema} from "mongoose";

const meetingSchema = new Schema(
    {
        username: {type: String},
        meetingCode: {type: String, required: true},
        date: {type: Date, default: Date.now, required: true},
        tags: {type: [String], default: []}
    }
)

const Meeting = mongoose.model("Meeting", meetingSchema);
export {Meeting};