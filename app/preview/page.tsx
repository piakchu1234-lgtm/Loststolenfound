"use client";

import { useState } from "react";
import { Monitor, Smartphone, Tablet, RotateCw } from "lucide-react";

type Device = {
  name: string;
  width: number;
  height: number;
  icon: typeof Monitor;
};

const devices: Device[] = [
  { name: "Desktop", width: 1920, height: 1080, icon: Monitor },
  { name: "Laptop", width: 1440, height: 900, icon: Monitor },
  { name: "Tablet", width: 768, height: 1024, icon: Tablet },
  { name: "Mobile L", width: 425, height: 844, icon: Smartphone },
  { name: "Mobile M", width: 375, height: 667, icon: Smartphone },
  { name: "Mobile S", width: 320, height: 568, icon: Smartphone },
];

export default function PreviewPage() {
  const [selectedDevice, setSelectedDevice] = useState<Device>(devices[0]);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  const toggleOrientation = () => {
    setOrientation(orientation === "portrait" ? "landscape" : "portrait");
  };

  const getDeviceDimensions = () => {
    if (orientation === "landscape") {
      return {
        width: selectedDevice.height,
        height: selectedDevice.width,
      };
    }
    return {
      width: selectedDevice.width,
      height: selectedDevice.height,
    };
  };

  const dimensions = getDeviceDimensions();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="max-w-full mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Device Preview
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">{selectedDevice.name}</span>
              <span className="text-gray-400">•</span>
              <span>{dimensions.width} × {dimensions.height}px</span>
              <span className="text-gray-400">•</span>
              <span className="capitalize">{orientation}</span>
            </div>
          </div>

          {/* Device Selection */}
          <div className="flex flex-wrap gap-2">
            {devices.map((device) => {
              const Icon = device.icon;
              const isSelected = selectedDevice.name === device.name;

              return (
                <button
                  key={device.name}
                  onClick={() => setSelectedDevice(device)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                    transition-all duration-200
                    ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {device.name}
                </button>
              );
            })}

            {/* Orientation Toggle */}
            {selectedDevice.name !== "Desktop" && selectedDevice.name !== "Laptop" && (
              <button
                onClick={toggleOrientation}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200 ml-2"
              >
                <RotateCw className="w-4 h-4" />
                Rotate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Device Frame */}
      <div className="flex items-center justify-center">
        <div
          className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-500 ease-in-out"
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            maxWidth: "100%",
            maxHeight: "calc(100vh - 200px)",
          }}
        >
          <iframe
            src="/"
            className="w-full h-full border-0"
            title="Website Preview"
            style={{
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
            }}
          />
        </div>
      </div>

      {/* Info Footer */}
      <div className="max-w-full mx-auto mt-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-700">Device:</span>
              <span className="ml-2 text-gray-600">{selectedDevice.name}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Resolution:</span>
              <span className="ml-2 text-gray-600">
                {dimensions.width} × {dimensions.height}px
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Orientation:</span>
              <span className="ml-2 text-gray-600 capitalize">{orientation}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              💡 Tip: Use this page to test responsive design and ensure the website works well across different devices.
              The preview loads your actual application in an iframe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
