import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema({
  userId: String,
  name: String,
  email: String,
  houseNumber: String,
  street: String,
  city: String,
  state: String,
  district: String,
  zip: String,
  country: String,
  phone: String,
  phoneCode: String,
  alternatePhone: String,
  alternatePhoneCode: String,
}, { timestamps: true });

export default mongoose.models.Address || mongoose.model("Address", AddressSchema);