'use server';

import cloudinary from '@/config/cloudinary';
import connectDB from '@/config/database';
import Property from '@/models/Property';
import { getSessionUser } from '@/utils/getSessionUser';
import { revalidatePath } from 'next/cache';

async function deleteProperty(propertyId) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !sessionUser.userId) {
    throw new Error('User ID is Required');
  }

  const { userId } = sessionUser;

  const property = await Property.findById(propertyId);

  if (!property) throw new Error('Property Not Found');

  // verify ownership
  if (property.owner.toString() !== userId) {
    throw new Error('Unauthorized');
  }

  // Extract public ID from image URLs
  const publicIds = property.images.map((imageUrl) => {
    const parts = imageUrl.split('/');
    return parts.at(-1).split('.').at(0);
  });

  // Delete image from cloudinary
  if (publicIds.length > 0) {
    for (let publicId of publicIds) {
      await cloudinary.uploader.destroy('sustainable-js/' + publicId);
    }
  }

  await property.deleteOne();
  revalidatePath('/', 'layout');
}
export default deleteProperty;
