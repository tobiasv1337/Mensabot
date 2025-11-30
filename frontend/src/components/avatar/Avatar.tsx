// src/components/Avatar.tsx
import React from "react";
import botImg from "../../assets/bot.png";
import userImg from "../../assets/user.png";
import "./avatar.css";

type AvatarType = "bot" | "user";

interface AvatarProps {
    type: AvatarType;
    src?: string;
    alt?: string;
    size?: number; // optional (px)
}

export const Avatar: React.FC<AvatarProps> = (
    {
        type,
        src,
        alt,
        size = 40,
    }) => {

    const placeholder = type === "bot" ? botImg : userImg;

    return (
        <img
            src={src || placeholder}
            alt={alt || type}
            className="avatar"
            style={{width: size, height: size}}
        />
    );
};
