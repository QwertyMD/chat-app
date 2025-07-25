import express from "express"
import { validateUser } from "../middlewares/auth.middleware";
import { messageController } from "../controllers/message.controller";
import { upload } from "../lib/multer";

export const messageRouter = express.Router();

messageRouter.post("/", validateUser, upload.single('attachment'), messageController.sendMessage)
messageRouter.get("/search", validateUser, messageController.searchMessage)
messageRouter.get("/:chatId", validateUser, messageController.getMessageByChat)
messageRouter.delete("/user/:messageId", validateUser, messageController.removeMessageForYourself)
messageRouter.delete("/both/:messageId", validateUser, messageController.removeMessageForBoth)
messageRouter.patch("/:messageId", validateUser, messageController.editMessage)
messageRouter.post("/read/all/:chatId", validateUser, messageController.markAllMessagesAsReadByChat)
messageRouter.get("/unread/:chatId", validateUser, messageController.getUnreadMessagesByChat)
messageRouter.get("/status/:messageId", validateUser, messageController.getReadStatusOfMessage)
