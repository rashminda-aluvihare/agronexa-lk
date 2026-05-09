const express = require("express");
const router = express.Router();

const client = require("../twilio");

router.post("/send-otp", async(req,res)=>{

   const { phone } = req.body;

   try{

      await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({
         to: phone,
         channel: "sms"
      });

      res.json({
         success:true,
         message:"OTP Sent Successfully"
      });

   }catch(err){

      res.json({
         success:false,
         error:err.message
      });

   }

});

router.post("/verify-otp", async(req,res)=>{

   const { phone, code } = req.body;

   try{

      const verification =
      await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({
         to: phone,
         code: code
      });

      if(verification.status === "approved"){

         res.json({
            success:true,
            message:"Phone Verified"
         });

      }else{

         res.json({
            success:false,
            message:"Invalid OTP"
         });

      }

   }catch(err){

      res.json({
         success:false,
         error:err.message
      });

   }

});

module.exports = router;