import { Request, Response } from "express";
import {
  IControllerRoutes,
  IController,
  IMentorCallScheduleProps,
  ISlotProps,
} from "interface";
import { AuthForMentor, AuthForUser } from "middleware";
import { BuddyCoins, CallSchedule, Chat, Mentor, Packages, User } from "model";
import { Ok, UnAuthorized, getTokenFromHeader, verifyToken } from "utils";
import moment from "moment-timezone";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import { WalletController } from "./wallet.controller";
import axios from "axios";
import { MentorWallet } from "model/mentor-wallet.model";

function generateRandomRoomId(length = 12): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length))
  ).join("");
}
export class MentorCallSchedule implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes.push({
      path: "/mentor/schedule/bulk-save",
      handler: this.MultiDaySchedule,
      method: "POST",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      path: "/mentor/schedule",
      handler: this.CreateCallSchedule,
      method: "POST",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.GetMyCallSchedule,
      method: "GET",
      path: "/mentor/schedule",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.DeleteSlotAsMentorById,
      method: "DELETE",
      path: "/mentor/schedule/:slotId",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.GetSlotByMentorId,
      method: "GET",
      path: "/mentor/schedule/get/:mentorId",
    });
    this.routes.push({
      handler: this.BookSlotByUserId,
      method: "PUT",
      path: "/slot/book",
    });
    this.routes.push({
      handler: this.GetAllSlots,
      method: "GET",
      path: "/all-slots",
    });
    this.routes.push({
      handler: this.ConfirmSlotByMentor,
      method: "PUT",
      path: "/confirm-slot",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.CancelSlotByMentor,
      method: "PUT",
      path: "/cancel-slot",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.GetMyCalls,
      method: "GET",
      path: "/mentor/calls",
    });
    this.routes.push({
      handler: this.GetUserCalls,
      method: "GET",
      path: "/user/calls",
      middleware:[AuthForUser]
    });

    this.routes.push({
      handler: this.UpdateSlot,
      method: "PUT",
      path: "/mentor/slot/:slotId",
      middleware: [AuthForMentor],
    });
  }

  public async GetAllSlots(req: Request, res: Response) {
    try {
      const slots = await CallSchedule.find();
      return Ok(res, slots);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetMyCalls(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const id = verifyToken(token);
      const calls = await Chat.find({ "users.mentor": id.id })
        .populate("users.mentor")
        .populate("users.user");
      return Ok(res, calls);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

   public async GetUserCalls(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const id = verifyToken(token);
      const calls = await Chat.find({ "users.user": id.id })
        .populate("users.mentor")
        .populate("users.user");
      return Ok(res, calls);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async MultiDaySchedule(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const id = verifyToken(token);
      const props: { time: string[]; slotsDate: string }[] = req.body;

      CallSchedule.insertMany(props);
      return Ok(res, "slots uploaded");
    } catch (err) {
      console.log(err);
      return UnAuthorized(res, err);
    }
  }

  public async CreateCallSchedule(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const id = verifyToken(token);
      const { slots, slotsDate }: IMentorCallScheduleProps = req.body;

      if (!slots) {
        return UnAuthorized(res, "missing time slots");
      }

      // Find if a schedule already exists for the provided date
      const existedSlotDate = await CallSchedule.findOne({
        mentorId: id.id,
        slotsDate,
      });

      if (existedSlotDate) {
        // Use updateOne with $addToSet to add new slots without duplicates
        await CallSchedule.updateOne(
          { mentorId: id.id, slotsDate },
          { $addToSet: { slots: { $each: slots } } } // Add only unique slots
        );

        return Ok(res, `New slots for ${slotsDate} have been added`);
      }

      // If no slots exist for the date, create a new schedule
      const slot = await new CallSchedule({
        mentorId: id.id,
        slotsDate: slotsDate,
        slots,
      }).save();

      return Ok(res, `slots are uploaded for ${slot.slotsDate}`);
    } catch (err) {
      console.log(err);
      return UnAuthorized(res, err);
    }
  }

  public async DeleteSlotAsMentorById(req: Request, res: Response) {
    try {
      const slotId = req.params.slotId;
      const slot = await CallSchedule.findByIdAndDelete({
        _id: slotId,
      });
      return Ok(res, `Slot deleted!`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetMyCallSchedule(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const mentorId = verifyToken(token);
      const slots = await CallSchedule.find({ mentorId: mentorId.id })
        .sort({ updatedAt: -1 })
        .populate(
          "mentorId",
          "accountStatus category subCategory specialists name email online block verified"
        )
        .populate("slots.userId", "name online block verified email");
      return Ok(res, slots);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetSlotByMentorId(req: Request, res: Response) {
    try {
      const mentorId = req.params.mentorId;
      const today = moment().tz("Asia/Kolkata").startOf("day").toISOString();

      const slots = await CallSchedule.find({
        mentorId: mentorId,
        slotsDate: { $gt: today },
      }).populate("slots.userId");
      console.log(slots);
      return Ok(res, slots);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async BookSlotByUserId(req: Request, res: Response) {
    try {
      const { userId, slotId, mentorId, callType, time, type } = req.body;
      if (!userId || !mentorId || !callType || !time || !type) {
        return UnAuthorized(res, "not valid configs found");
      }
      if (type === "slot" && !slotId) {
        return UnAuthorized(res, "Slot ID is required for booking a slot.");
      }

      const user = await User.findById(userId).lean();
      const mentor = await Mentor.findById(mentorId).lean();
      if (!user || !mentor) {
        return UnAuthorized(res, "User or Mentor not found.");
      }

      const packages = await Packages.findOne({
        packageType: callType,
        mentorId: mentor._id,
      }).lean();
      const userWallet = await BuddyCoins.findOne({ userId }).lean();
      if (!packages || !userWallet) {
        return UnAuthorized(res, "Package or Wallet not found.");
      }

      const slotBalance = userWallet.balance - packages.price * parseInt(time);
      if (slotBalance < 0) {
        return UnAuthorized(res, "Insufficient balance.");
      }

      await BuddyCoins.updateOne({ userId }, { balance: slotBalance });

      if (type === "slot") {
        await CallSchedule.updateOne(
          { slots: { $elemMatch: { _id: slotId } } },
          {
            $set: {
              "slots.$.booked": true,
              "slots.$.userId": userId,
              "slots.$.status": "pending",
              "slots.$.callType": callType,
              "slots.$.duration": time,
            },
          }
        );
      }

      let hostJoinURL: string | undefined;
      let guestJoinURL: string | undefined;
      let roomId: string = generateRandomRoomId();

      if (callType === "audio" || callType === "video") {
        const roomResponse = await axios.post(
          "https://api.100ms.live/v2/rooms",
          {
            name: `slot-booking-${Date.now()}`,
            description: "Mentorship Session",
            template_id:
              callType === "video"
                ? process.env.REACT_APP_100MD_SDK_VIDEO_TEMPLATE
                : process.env.REACT_APP_100MD_SDK_AUDIO_TEMPLATE,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.REACT_APP_100MD_SDK_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );

        roomId = roomResponse.data.id || roomId;

        const [hostCodeRes, guestCodeRes] = await Promise.all([
          axios.post(
            `https://api.100ms.live/v2/room-codes/room/${roomId}/role/host`,
            {},
            {
              headers: {
                Authorization: `Bearer ${process.env.REACT_APP_100MD_SDK_TOKEN}`,
              },
            }
          ),
          axios.post(
            `https://api.100ms.live/v2/room-codes/room/${roomId}/role/guest`,
            {},
            {
              headers: {
                Authorization: `Bearer ${process.env.REACT_APP_100MD_SDK_TOKEN}`,
              },
            }
          ),
        ]);

        const baseURL =
          callType === "video"
            ? process.env.REACT_APP_100MD_SDK_VIDEO_URL
            : process.env.REACT_APP_100MD_SDK_AUDIO_URL;

        hostJoinURL = `https://${baseURL}.app.100ms.live/meeting/${hostCodeRes.data.code}`;
        guestJoinURL = `https://${baseURL}.app.100ms.live/meeting/${guestCodeRes.data.code}`;
      } else {
        guestJoinURL = `https://alterbuddy.com/user/chat/${mentor._id}/${roomId}`;
        hostJoinURL = `https://alterbuddy.com/user/chat/${mentor._id}/${roomId}`;
      }
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + parseInt(time) * 60000); // Add minutes in milliseconds

      if (type != "slot") {
        const totalAmount = packages.price * parseInt(time);
        const mentorShare = totalAmount * 0.7;
        const adminShare = totalAmount * 0.3;

        await MentorWallet.create({
          userId,
          mentorId,
          slotId: type === "slot" ? slotId : undefined,
          amount: totalAmount,
          mentorShare,
          adminShare,
          type: "debit",
          status: "confirmed",
          description: "User booked a mentor session",
        });
        await Chat.create({
          users: {
            user: userId,
            mentor: mentorId,
          },
          sessionDetails: {
            roomId,
            roomCode: {
              host: hostJoinURL ? hostJoinURL.split("/").pop() : undefined,
              mentor: guestJoinURL ? guestJoinURL.split("/").pop() : undefined,
            },
            roomName: `Session-${Date.now()}`,
            callType,
            duration: `${time} mins`,
            startTime,
            endTime,
          },
          status: "PENDING",
        });

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: { rejectUnauthorized: true },
        });

        // --- Send Email to USER ---
        const userMailOptions = {
          from: process.env.SMTP_FROM,
          to: user.email,
          subject: "Your Mentor Slot Has Been Confirmed!",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Slot Confirmation</title>
                <style><!DOCTYPE html>
              <html>
              <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Slot Confirmation</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 20px;
                }
                .email-container {
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  padding: 20px;
                  border-radius: 5px;
                  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }
                .email-header {
                  text-align: center;
                  background-color: #4caf50;
                  padding: 20px;
                  color: #ffffff;
                  border-radius: 5px 5px 0 0;
                }
                .email-body {
                  padding: 20px;
                  color: #333333;
                }
                .join-button {
                  display: inline-block;
                  padding: 15px 25px;
                  background-color: #4caf50;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 5px;
                  margin: 20px 0;
                }
                .join-button:hover {
                  background-color: #45a049;
                }
                .email-footer {
                  text-align: center;
                  font-size: 12px;
                  color: #999999;
                  margin-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <h1>Slot Confirmation</h1>
                </div>
                <div class="email-body">
                  <p>Hi ${user.name.firstName} ${user.name.lastName},</p>
                  <p>Your mentor <strong>${mentor.name.firstName} ${mentor.name.lastName}</strong> has confirmed your session!</p>
                  <p>Click below to join your session:</p>
                  <p style="text-align: center;">
                    <a href="${guestJoinURL}" class="join-button">Join Session</a>
                  </p>
                  <p>If you have any questions, please contact support.</p>
                  <p>Thank you!</p>
                </div>
                <div class="email-footer">
                  <p>&copy; 2025 Alter Buddy. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
  
          `,
        };
        await transporter.sendMail(userMailOptions);

        // --- Send Email to MENTOR ---
        const mentorMailOptions = {
          from: process.env.SMTP_FROM,
          to: mentor.contact.email,
          subject: "New Mentorship Session Booked!",
          html: `
            <!DOCTYPE html>
              <html>
              <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Slot Confirmation</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 20px;
                }
                .email-container {
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  padding: 20px;
                  border-radius: 5px;
                  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }
                .email-header {
                  text-align: center;
                  background-color: #4caf50;
                  padding: 20px;
                  color: #ffffff;
                  border-radius: 5px 5px 0 0;
                }
                .email-body {
                  padding: 20px;
                  color: #333333;
                }
                .join-button {
                  display: inline-block;
                  padding: 15px 25px;
                  background-color: #4caf50;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 5px;
                  margin: 20px 0;
                }
                .join-button:hover {
                  background-color: #45a049;
                }
                .email-footer {
                  text-align: center;
                  font-size: 12px;
                  color: #999999;
                  margin-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <h1>Slot Confirmation</h1>
                </div>
                <div class="email-body">
                  <p>Hi ${mentor.name.firstName} ${mentor.name.lastName},</p>
                  <p>A new mentorship session has been booked by <strong>${user.name.firstName} ${user.name.lastName}</strong>.</p>
                  <p>Click below to join the session:</p>
                  <p style="text-align: center;" >
                    <a href="${hostJoinURL}" class="join-button" style="background: #45a049; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px;">Join as Mentor</a>
                  </p>
                  <p>If you have any issues, feel free to contact support.</p>
                  <p>Thank you!</p>
                </div>
                <div class="email-footer">
                  <p>&copy; 2025 Alter Buddy. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>`,
        };
        await transporter.sendMail(mentorMailOptions);
      }

      return Ok(res, {
        message: `Hey! ${user.name.firstName} ${user.name.lastName}, your slot is booked with ${mentor.name.firstName} ${mentor.name.lastName}`,
        link: guestJoinURL,
      });
    } catch (err) {
      console.error("BookSlot Error:", err);
      return UnAuthorized(
        res,
        err instanceof Error ? err.message : "Unknown error occurred."
      );
    }
  }

  public async UpdateSlot(req: Request, res: Response) {
    try {
      const { slotId } = req.params;
      if (!slotId) {
        return UnAuthorized(res, "failed to update");
      } else {
        const updated = await CallSchedule.findOneAndUpdate(
          {
            slots: {
              $elemMatch: {
                _id: new mongoose.Types.ObjectId(slotId),
              },
            },
          },
          {
            $set: {
              "slots.$.note": req.body.note,
            } as Partial<IMentorCallScheduleProps>,
          },
          { new: true }
        );
        return Ok(res, "slot updated");
      }
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async ConfirmSlotByMentor(req: Request, res: Response) {
    try {
      const { slotId, mentorId, userId } = req.body;
      if (!slotId || !mentorId || !userId) {
        return UnAuthorized(res, "Not valid configs found");
      }

      const user = await User.findById(userId).lean();
      const mentor = await Mentor.findById(mentorId).lean();
      const slotData = await CallSchedule.findOne({
        slots: { $elemMatch: { _id: slotId } },
      }).lean();

      if (!user || !mentor || !slotData) {
        return UnAuthorized(res, "User, Mentor, or Slot not found.");
      }
      const slot = slotData.slots.find((s) => String(s._id) === slotId);
      if (!slot) {
        return UnAuthorized(res, "Slot not found in CallSchedule.");
      }
      let hostJoinURL: string | undefined;
      let guestJoinURL: string | undefined;
      let roomId: string = generateRandomRoomId();

      const startTime = moment(
        `${slotData.slotsDate} ${slot.time}`,
        "YYYY-MM-DD hh:mm A"
      );

      const packages = await Packages.findOne({
        packageType: slot?.callType,
        mentorId: mentor._id,
      }).lean();

      const totalAmount = slot.duration * packages.price;
      const mentorShare = totalAmount * 0.7;
      const adminShare = totalAmount * 0.3;

      await MentorWallet.create({
        userId,
        mentorId,
        slotId,
        amount: totalAmount,
        mentorShare,
        adminShare,
        type: "credit",
        status: "confirmed",
        description: "Mentor confirmed session",
      });

      // Step 2: Create endTime
      const roomResponse = await axios.post(
        "https://api.100ms.live/v2/rooms",
        {
          name: `slot-booking-${Date.now()}`,
          description: "Mentorship Session",
          template_id:
            slot.callType === "video"
              ? process.env.REACT_APP_100MD_SDK_VIDEO_TEMPLATE
              : process.env.REACT_APP_100MD_SDK_AUDIO_TEMPLATE,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_100MD_SDK_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      roomId = roomResponse.data.id || roomId;

      const [hostCodeRes, guestCodeRes] = await Promise.all([
        axios.post(
          `https://api.100ms.live/v2/room-codes/room/${roomId}/role/host`,
          {},
          {
            headers: {
              Authorization: `Bearer ${process.env.REACT_APP_100MD_SDK_TOKEN}`,
            },
          }
        ),
        axios.post(
          `https://api.100ms.live/v2/room-codes/room/${roomId}/role/guest`,
          {},
          {
            headers: {
              Authorization: `Bearer ${process.env.REACT_APP_100MD_SDK_TOKEN}`,
            },
          }
        ),
      ]);

      const baseURL =
        slot.callType === "video"
          ? process.env.REACT_APP_100MD_SDK_VIDEO_URL
          : process.env.REACT_APP_100MD_SDK_AUDIO_URL;

      hostJoinURL = `https://${baseURL}.app.100ms.live/meeting/${hostCodeRes.data.code}`;
      guestJoinURL = `https://${baseURL}.app.100ms.live/meeting/${guestCodeRes.data.code}`;
      const endTime = startTime.clone().add(slot.duration, "minutes");

      await Chat.create({
        users: {
          user: userId,
          mentor: mentorId,
        },
        sessionDetails: {
          roomId,
          roomCode: {
            host: hostJoinURL ? hostJoinURL.split("/").pop() : undefined,
            mentor: guestJoinURL ? guestJoinURL.split("/").pop() : undefined,
          },
          roomName: `Session-${Date.now()}`,
          callType: slot.callType,
          duration: `${slot.duration} mins`,
          startTime,
          endTime,
        },
        status: "PENDING",
      });

      const formattedDate = startTime.format("dddd, MMMM Do YYYY"); // e.g. Monday, June 10th 2025
      const formattedTime = startTime.format("hh:mm A"); // e.g. 04:00 PM
      const formattedDuration = `${slot.duration} minutes`; // e.g. 30 minutes

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: true },
      });

      // --- Send Email to USER ---

      const userMailOptions = {
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: "Your Mentor Slot Has Been Confirmed!",
        html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Session Confirmation</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f9f9f9;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 30px auto;
            background: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            background-color: #4caf50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            margin: 20px 0;
            color: #333;
          }
          .join-button {
            display: block;
            width: fit-content;
            margin: 20px auto;
            padding: 15px 25px;
            background-color: #4caf50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #999;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Session Confirmed</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name.firstName} ${user.name.lastName},</p>
            <p><strong>Your mentor ${mentor.name.firstName} ${mentor.name.lastName} has confirmed your session!</strong></p>
            <p>🗓 <strong>Date:</strong> ${formattedDate}</p>
            <p>⏰ <strong>Time:</strong> ${formattedTime}</p>
            <p>⏳ <strong>Duration:</strong> ${formattedDuration}</p>
            <a href="${guestJoinURL}" class="join-button">👉 Join Session</a>
            <p>Please join 5 minutes before your scheduled time. Being late may reduce your available session time.</p>
            <p>If you have any questions, feel free to contact our support team.</p>
          </div>
          <div class="footer">
            <p>©️ 2025 AlterBuddy. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `,
      };

      await transporter.sendMail(userMailOptions);

      // --- Send Email to MENTOR ---
      const mentorMailOptions = {
        from: process.env.SMTP_FROM,
        to: mentor.contact.email,
        subject: "New Mentorship Session Booked!",
        html: `
            <!DOCTYPE html>
              <html>
              <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Slot Confirmation</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 20px;
                }
                .email-container {
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  padding: 20px;
                  border-radius: 5px;
                  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }
                .email-header {
                  text-align: center;
                  background-color: #4caf50;
                  padding: 20px;
                  color: #ffffff;
                  border-radius: 5px 5px 0 0;
                }
                .email-body {
                  padding: 20px;
                  color: #333333;
                }
                .join-button {
                  display: inline-block;
                  padding: 15px 25px;
                  background-color: #4caf50;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 5px;
                  margin: 20px 0;
                }
                .join-button:hover {
                  background-color: #45a049;
                }
                .email-footer {
                  text-align: center;
                  font-size: 12px;
                  color: #999999;
                  margin-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <h1>Slot Confirmation</h1>
                </div>
                <div class="email-body">
                  <p>Hi ${mentor.name.firstName} ${mentor.name.lastName},</p>
                  <p>A new mentorship session has been booked by <strong>${user.name.firstName} ${user.name.lastName}</strong>.</p>
                  <p>Click below to join the session:</p>
                  <p style="text-align: center;" >
                    <a href="${hostJoinURL}" class="join-button" style="background: #45a049; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px;">Join as Mentor</a>
                  </p>
                  <p>If you have any issues, feel free to contact support.</p>
                  <p>Thank you!</p>
                </div>
                <div class="email-footer">
                  <p>&copy; 2025 Alter Buddy. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>`,
      };
      await transporter.sendMail(mentorMailOptions);

      // === Update Slot Status ===
      await CallSchedule.updateOne(
        { "slots._id": slotId },
        { $set: { "slots.$.status": "accepted" } }
      );

      return Ok(res, `Slot confirmed and chat created successfully`);
    } catch (err) {
      console.error("ConfirmSlotByMentor Error:", err);
      return UnAuthorized(
        res,
        err instanceof Error ? err.message : "Unknown error occurred."
      );
    }
  }

  public async CancelSlotByMentor(req: Request, res: Response) {
    try {
      const schedule = await CallSchedule.findOne({
        "slots._id": req.body,
      });
      const slot = await CallSchedule.findOneAndUpdate(
        {
          "slots._id": req.body,
        },
        {
          $set: {
            "slots.$.status": "rejected",
            "slots.$.booked": false,
          },
          $unset: {
            "slots.$.userId": "", // Unsetting userId properly
          },
        },
        { new: true }
      );
      return Ok(res, `Slot rejected`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
}
