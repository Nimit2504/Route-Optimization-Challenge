import "dotenv/config"
import { connect } from "mongoose"

const connectDB = () => {
  connect(process.env.MONGO_URI).then(console.log("connected")).catch((e)=> console.log("error in db", e))
}

export default connectDB;
