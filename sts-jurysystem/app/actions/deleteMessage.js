'use server';

import cloudinary from '@/config/cloudinary';
import connectDB from '@/config/database';
import Message from '@/models/Message';
import { getSessionUser } from '@/utils/getSessionUser';
import { revalidatePath } from 'next/cache';

async function deleteMessage(messageId) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !sessionUser.userId) {
    throw new Error('User ID is Required');
  }

  const { userId } = sessionUser;

  const message = await Message.findById(messageId);
  
  if (message.recipent.toString() !== userId){
    throw new Error('Unauthorized')
  }

  await Message.deleteOne()

  revalidatePath('/','layout')
 
}
export default deleteMessage;
