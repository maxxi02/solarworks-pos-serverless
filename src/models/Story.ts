import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStory extends Document {
  authorId: string;
  authorName: string;
  authorImage?: string;
  title: string;
  description?: string;
  images: string[];
  likedBy: string[]; // Array of user IDs who liked the story
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorImage: {
      type: String,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    images: {
      type: [String],
      required: true,
      validate: [
        (val: string[]) => val.length > 0,
        'At least one image is required',
      ],
    },
    likedBy: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Create index for fetching feed (newest first)
StorySchema.index({ createdAt: -1 });

export const Story: Model<IStory> =
  mongoose.models.Story || mongoose.model<IStory>('Story', StorySchema);
