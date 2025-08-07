// const { Password } = require('@mui/icons-material');
const mongoose=require('mongoose');
mongoose.connect("mongodb://127.0.0.1:27017/miniproject")   
 .then(() => console.log("Connected"))
  .catch((e) => console.log("Error:", e));
const userSchema =mongoose.Schema({
    username: String,
    name: String,
    age:Number,
    email:String,
    password: String,
    posts: [{type: mongoose.Schema.Types.ObjectId, ref:"post"}],
    profilepic:{
      type: String,
      default: "default.jpeg"
    }
});
module.exports=mongoose.model('user',userSchema)