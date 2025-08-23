import React from "react";
import { Camera, Grid3X3, Smile } from "lucide-react";
import { Button } from "./ui/button";

export type Screen = 'camera' | 'gallery' | 'faces';

interface BottomNavigationProps {
  activeScreen: Screen;
  onScreenChange: (screen: Screen) => void;
}

export function BottomNavigation({
  activeScreen,
  onScreenChange,
}: BottomNavigationProps) {
  const navItems = [
    {
      id: "camera" as Screen,
      label: "Camera",
      icon: Camera,
    },
    {
      id: "gallery" as Screen,
      label: "Gallery",
      icon: Grid3X3,
    },
    {
      id: "faces" as Screen,
      label: "Faces",
      icon: Smile,
    },
  ];

  return (
    <nav className="bg-background border-t border-border">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onScreenChange(item.id)}
              className={`flex flex-col items-center justify-center p-2 min-h-12 transition-colors duration-200 ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-1 ${isActive ? "text-primary" : ""}`}
              />
              <span
                className={`text-xs ${isActive ? "text-primary font-medium" : ""}`}
              >
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}