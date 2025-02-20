import mongoose from "mongoose";

const screenSchema = new mongoose.Schema({
    id: String,
    slaveUrl: String,
    name: String,
    content: mongoose.Schema.Types.Mixed,
    registered: { type: Boolean, default: false },
    currentAd: { type: String, default: null },
    deviceId: String
});

const Screen = mongoose.model("Screen", screenSchema);
export default Screen;
