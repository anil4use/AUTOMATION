import mongoose from 'mongoose';
export declare function connectDatabase(uri: string): Promise<typeof mongoose>;
