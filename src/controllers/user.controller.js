const jwt = require('jsonwebtoken');
const appConfig = require('../config/appConfig');
const User = require('../models/user.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require('../utils/cloudinary');

const registerUser = asyncHandler(async (req, res) => {
  //Get user details from request
  const { username, email, fullName, password } = req.body;
  //validations
  if (!username || !email || !fullName || !password) {
    throw new ApiError(400, 'All fields are required');
  }
  //Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    throw new ApiError(409, 'User with email or username already exists');
  }
  //Upload avatar if provided
  let avatarLocalPath;
  let avatarUpload = {};
  if (req.files && req.files.avatar && req?.files?.avatar[0]?.path) {
    avatarLocalPath = req.files.avatar[0].path;
    const uploadResult = await uploadToCloudinary(
      avatarLocalPath,
      'youtube/avatars'
    );

    if (!uploadResult) {
      throw new ApiError(500, 'Error uploading avatar');
    }
    avatarUpload = {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url,
    };
  }

  //Upload cover image if provided
  let coverImageLocalPath;
  let coverImageUpload = {};
  if (req.files && req.files.coverImage && req?.files?.coverImage[0]?.path) {
    coverImageLocalPath = req.files.coverImage[0].path;
    const uploadResult = await uploadToCloudinary(
      coverImageLocalPath,
      'youtube/cover-images'
    );

    if (!uploadResult) {
      throw new ApiError(500, 'Error uploading cover image');
    }
    coverImageUpload = {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url,
    };
  }

  //Create the user
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    password,
    avatar: Object.keys(avatarUpload).length > 0 ? avatarUpload : undefined,
    coverImage:
      Object.keys(coverImageUpload).length > 0 ? coverImageUpload : undefined,
  });

  // Remove password and refresh token from response
  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );

  if (!createdUser) {
    throw new Error('Error registering user');
  }
  //Return the response
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, 'User registered successfully'));
});

module.exports = {
  registerUser,
};
