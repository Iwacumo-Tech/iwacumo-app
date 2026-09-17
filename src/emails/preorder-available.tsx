import * as React from "react";
import {
  Body, Button, Container, Head, Heading,
  Hr, Html, Img, Preview, Section, Text,
} from "@react-email/components";

interface PreorderAvailableTemplateProps {
  firstName: string;
  bookTitle: string;
  bookCoverUrl: string | null;
  bookUrl: string;
}

export function PreorderAvailableTemplate({
  firstName,
  bookTitle,
  bookCoverUrl,
  bookUrl,
}: PreorderAvailableTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>Your pre-ordered book is now available to read!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>IWACUMO.</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Your Book is Ready<span style={{ color: "#FFD700" }}>.</span></Heading>

            <Text style={paragraph}>
              Hey <strong>{firstName}</strong>, great news! The book you pre-ordered is now available to read.
            </Text>

            {bookCoverUrl && (
              <Section style={coverContainer}>
                <Img
                  src={bookCoverUrl}
                  alt={bookTitle}
                  width="200"
                />
              </Section>
            )}

            <Section style={bookInfo}>
              <Text style={bookTitleStyle}>{bookTitle}</Text>
              <Text style={bookMessage}>
                Head to your library to start reading now.
              </Text>
            </Section>

            <Section style={buttonContainer}>
              <Button href={bookUrl} style={button}>
                READ NOW
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              Questions? Reply to this email or visit our support page.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#FAF9F6",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};
const container: React.CSSProperties = {
  margin: "0 auto", padding: "20px 0 48px", width: "560px", maxWidth: "100%",
};
const header: React.CSSProperties = {
  backgroundColor: "#000000", padding: "24px 40px",
};
const logo: React.CSSProperties = {
  color: "#FFD700", fontSize: "28px", fontWeight: "900",
  fontStyle: "italic", letterSpacing: "-1px", margin: "0",
};
const content: React.CSSProperties = {
  backgroundColor: "#ffffff", border: "2px solid #000000", padding: "40px",
};
const h1: React.CSSProperties = {
  color: "#0A0A0A", fontSize: "32px", fontWeight: "900",
  fontStyle: "italic", textTransform: "uppercase", margin: "0 0 16px",
};
const paragraph: React.CSSProperties = {
  color: "#444444", fontSize: "15px", lineHeight: "1.6", margin: "0 0 16px",
};
const coverContainer: React.CSSProperties = {
  textAlign: "center", margin: "24px 0",
};
const coverImage: React.CSSProperties = {
  border: "2px solid #000000", borderRadius: "4px",
};
const bookInfo: React.CSSProperties = {
  textAlign: "center", margin: "24px 0",
};
const bookTitleStyle: React.CSSProperties = {
  color: "#000", fontSize: "18px", fontWeight: "900",
  fontStyle: "italic", margin: "0 0 8px",
};
const bookMessage: React.CSSProperties = {
  color: "#666", fontSize: "14px", margin: "0",
};
const buttonContainer: React.CSSProperties = { textAlign: "center", margin: "28px 0" };
const button: React.CSSProperties = {
  backgroundColor: "#FFD700", border: "2px solid #000000", color: "#000000",
  display: "inline-block", fontSize: "13px", fontWeight: "900",
  letterSpacing: "2px", padding: "16px 40px",
  textDecoration: "none", textTransform: "uppercase",
};
const hr: React.CSSProperties = {
  border: "none", borderTop: "1px solid #E5E5E5", margin: "24px 0",
};
const footer: React.CSSProperties = {
  color: "#999999", fontSize: "12px", lineHeight: "1.5",
};
