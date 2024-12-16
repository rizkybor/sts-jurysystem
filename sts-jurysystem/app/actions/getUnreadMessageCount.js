"use server";
import connectDB from "@/config/database";
import Message from "@/models/Message";
import { getSessionUser } from "@/utils/getSessionUser";

async function getUnreadMessageCount() {
  await connectDB();

  const sessionUser = await getSessionUser();

  if (!sessionUser || !sessionUser.userId) {
    throw new Error("User ID not found");
  }

  const { userId } = sessionUser;

  const count = await Message.countDocuments({
    recipent: userId,
    read: false,
  });

  return { count };
}

export default getUnreadMessageCount;
