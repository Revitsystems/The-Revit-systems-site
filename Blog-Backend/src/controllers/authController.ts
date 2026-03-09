import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  createUser,
  findUserByEmail,
  updateLastLogin,
} from "@/models/userModel.js";
import { recordLogin } from "@/models/loginHistoryModel.js";

export const register = async (req: Request, res: Response) => {
  console.log(req.body);
  const { first_name, last_name, email, password_hash } = req.body;

  if (!first_name || !last_name || !email || !password_hash) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password_hash, 10);

  const user = await createUser(first_name, last_name, email, hashedPassword);

  res.status(201).json({ id: user.id, email: user.email });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await findUserByEmail(email);

  // user not found
  if (!user) {
    await recordLogin(null, req, false);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  // password incorrect
  if (!isMatch) {
    await recordLogin(user.id, req, false);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // successful login
  await recordLogin(user.id, req, true);

  // update last login timestamp
  await updateLastLogin(user.id);

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "1d" }
  );

  res.json({ token });
};
