import React, { useEffect, useState } from "react";
import { useBookStore } from "@/lib/store"; // Zustand store

interface BookReaderProps {
  initialContent: string;  // Content that changes when you navigate chapters
}

interface Comment {
  text: string;
  comment: string;
}

const BookReader: React.FC<BookReaderProps> = ({ initialContent }) => {
  const { content, setContent } = useBookStore();  // Zustand state management
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [showColorModal, setShowColorModal] = useState(false); // Color modal
  const [showCommentBox, setShowCommentBox] = useState(false); // Comment modal
  const [comments, setComments] = useState<Comment[]>([]); // For storing comments
  const [pendingChanges, setPendingChanges] = useState<string | null>(null); // For unsaved changes

  // Effect to handle content changes when navigating chapters
  useEffect(() => {
    // Whenever the initialContent prop changes, update the Zustand state
    setContent(initialContent);
    setPendingChanges(null); // Clear any unsaved changes when switching chapters
  }, [initialContent, setContent]);

  // Handle text selection and display formatting modal
  const handleMouseUp = () => {
    const selection = window.getSelection();

    if (selection && selection.toString().length > 0) {
      const rect = selection.getRangeAt(0).getBoundingClientRect();

      setSelectedText(selection.toString());
      setModalPosition({ top: rect.top + window.scrollY, left: rect.left });
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  };

  // Apply bold formatting
  const applyBold = () => {
    if (selectedText) {
      const newContent = content.replace(
        selectedText,
        `<b>${selectedText}</b>`
      );

      setPendingChanges(newContent); // Store unsaved changes
      setShowModal(false);
    }
  };

  // Show color modal
  const handleColorClick = () => {
    setShowModal(false);
    setShowColorModal(true);
  };

  // Apply color formatting
  const applyColor = (color: string) => {
    if (selectedText) {
      const newContent = content.replace(
        selectedText,
        `<span style="color:${color};">${selectedText}</span>`
      );

      setPendingChanges(newContent); // Store unsaved changes
      setShowColorModal(false);
    }
  };

  // Show comment box modal
  const handleCommentClick = () => {
    setShowModal(false);
    setShowCommentBox(true);
  };

  // Save comment to the selected text
  const saveComment = (commentText: string) => {
    if (selectedText) {
      const newContent = content.replace(
        selectedText,
        `<span data-comment="${commentText}" style="border-bottom: 1px dotted;">${selectedText}</span>`
      );

      setComments([...comments, { text: selectedText, comment: commentText }]);
      setPendingChanges(newContent); // Store unsaved changes
      setShowCommentBox(false);
    }
  };

  // Handle hover to show comment modal
  const handleMouseOver = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    const target = e.target as HTMLSpanElement;
    const commentText = target.getAttribute("data-comment");

    if (commentText) {
      const rect = target.getBoundingClientRect();

      setModalPosition({ top: rect.top + window.scrollY - 40, left: rect.left });
      setShowModal(true); // Display comment on hover
    }
  };

  // Save all changes to localStorage when the user clicks the save button
  const handleSave = () => {
    if (pendingChanges) {
      setContent(pendingChanges);
      localStorage.setItem("bookContent", pendingChanges);
      setPendingChanges(null); // Clear pending changes after saving
    }
  };

  return (
    <div className="relative">
      {/* Save Button */}
      <div className="flex justify-end p-4">
        <button className="p-2 bg-green-500 text-white rounded" onClick={handleSave}>
          Save
        </button>
      </div>

      {/* Render the HTML content */}
      <div
        className="p-4"
        onMouseUp={handleMouseUp}
        dangerouslySetInnerHTML={{ __html: pendingChanges || content }}
        onMouseOver={handleMouseOver} // Handle comment hover
      />

      {/* Modal for formatting options */}
      {showModal && !showColorModal && !showCommentBox && (
        <div
          className="absolute bg-white border rounded shadow p-2"
          style={{ top: modalPosition.top, left: modalPosition.left }}
        >
          <button className="p-1 m-1 bg-yellow-200" onClick={handleColorClick}>
            Highlight
          </button>
          <button className="p-1 m-1 bg-blue-200" onClick={applyBold}>
            Bold
          </button>
          <button className="p-1 m-1 bg-gray-200" onClick={handleCommentClick}>
            Comment
          </button>
        </div>
      )}

      {/* Color selection modal */}
      {showColorModal && (
        <div
          className="absolute bg-white border rounded shadow p-2"
          style={{ top: modalPosition.top, left: modalPosition.left }}
        >
          {["yellow", "red", "green", "blue", "purple", "orange"].map((color) => (
            <button
              key={color}
              className={`p-2 m-1 bg-${color}-500 rounded`}
              onClick={() => applyColor(color)}
            >
              {color}
            </button>
          ))}
        </div>
      )}

      {/* Comment box modal */}
      {showCommentBox && (
        <div
          className="absolute bg-white border rounded shadow p-4"
          style={{ top: modalPosition.top, left: modalPosition.left }}
        >
          <textarea
            className="w-full border p-2"
            placeholder="Enter comment"
            onBlur={(e) => saveComment(e.target.value)}
          />
        </div>
      )}
    </div>
  );
};

export default BookReader;
