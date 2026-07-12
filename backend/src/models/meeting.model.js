import mongoose, {Schema} from "mongoose";

const meetingSchema = new Schema(
    {
        username: {type: String},
        meetingCode: {type: String, required: true},
        date: {type: Date, default: Date.now, required: true}
    }
)

const Meeting = mongoose.model("Meeting", meetingSchema);
export {Meeting};