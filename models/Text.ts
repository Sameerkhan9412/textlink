import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { TEXT_MAX } from "@/lib/code";

const textSchema = new Schema(
  {
    // unique index is the real guarantee against duplicate codes
    code: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    content: { type: String, required: true, maxlength: TEXT_MAX },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

export type TextDoc = InferSchemaType<typeof textSchema>;

export const TextModel: Model<TextDoc> =
  (mongoose.models.Text as Model<TextDoc> | undefined) ?? mongoose.model<TextDoc>("Text", textSchema);
