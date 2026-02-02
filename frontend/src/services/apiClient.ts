import { MensaBotClient } from "./api";

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

let client: MensaBotClient | null = null;

export const getApiClient = () => {
  if (!client) {
    client = new MensaBotClient(API_BASE_URL);
  }
  return client;
};
