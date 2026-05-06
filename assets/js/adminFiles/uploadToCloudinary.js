/* ============================================
   uploadToCloudinary.js — Image upload utility
   Load this before api.js and app.js
   ============================================ */

const CLOUDINARY_CLOUD_NAME = "dmvltush8";
const CLOUDINARY_UPLOAD_PRESET = "revit_unsigned"; // replace with your preset name

const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  Utils.showLoader();

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Cloudinary upload failed");
    }

    const data = await response.json();
    return data.secure_url;
  } finally {
    Utils.hideLoader();
  }
};
