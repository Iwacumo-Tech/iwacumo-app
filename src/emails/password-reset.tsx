import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
 
interface PasswordResetTemplateProps {
  firstName: string;
  resetUrl: string;
}
 
export function PasswordResetTemplate({
  firstName,
  resetUrl,
}: PasswordResetTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your iwacumo password — link expires in 1 hour</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>IWACUMO.</Heading>
          </Section>
 
          <Section style={content}>
            <Heading style={h1}>Password Reset</Heading>
            <Text style={greeting}>Hey {firstName},</Text>
            <Text style={paragraph}>
              We received a request to reset your password. Click the button below
              to choose a new one.
            </Text>
            <Text style={warning}>
              ⚠️ This link expires in <strong>1 hour</strong>. If you didn&apos;t
              request this, ignore this email — your password won&apos;t change.
            </Text>
 
            <Section style={buttonContainer}>
              <Button href={resetUrl} style={button}>
                RESET MY PASSWORD
              </Button>
            </Section>
 
            <Text style={smallText}>Or copy and paste this URL:</Text>
            <Text style={link}>{resetUrl}</Text>
 
            <Hr style={hr} />
            <Text style={footer}>
              For security, this link can only be used once. If you need another
              reset link, visit the forgot password page again.
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
  margin: "0 auto",
  padding: "20px 0 48px",
  width: "560px",
  maxWidth: "100%",
};
const header: React.CSSProperties = {
  backgroundColor: "#000000",
  padding: "24px 40px",
};
const logo: React.CSSProperties = {
  color: "#FFD700",
  fontSize: "28px",
  fontWeight: "900",
  fontStyle: "italic",
  letterSpacing: "-1px",
  margin: "0",
};
const content: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "2px solid #000000",
  padding: "40px",
};
const h1: React.CSSProperties = {
  color: "#0A0A0A",
  fontSize: "28px",
  fontWeight: "900",
  textTransform: "uppercase",
  fontStyle: "italic",
  letterSpacing: "-0.5px",
  margin: "0 0 24px",
};
const greeting: React.CSSProperties = {
  color: "#0A0A0A",
  fontSize: "16px",
  fontWeight: "700",
  margin: "0 0 8px",
};
const paragraph: React.CSSProperties = {
  color: "#444444",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};
const warning: React.CSSProperties = {
  backgroundColor: "#FFF8E1",
  border: "1px solid #FFD700",
  color: "#555",
  fontSize: "13px",
  lineHeight: "1.6",
  padding: "12px 16px",
  margin: "0 0 24px",
};
const buttonContainer: React.CSSProperties = {
  textAlign: "center",
  margin: "32px 0",
};
const button: React.CSSProperties = {
  backgroundColor: "#FFD700",
  border: "2px solid #000000",
  color: "#000000",
  display: "inline-block",
  fontSize: "13px",
  fontWeight: "900",
  letterSpacing: "2px",
  padding: "16px 40px",
  textDecoration: "none",
  textTransform: "uppercase",
};
const smallText: React.CSSProperties = {
  color: "#888888",
  fontSize: "12px",
  margin: "24px 0 4px",
};
const link: React.CSSProperties = {
  color: "#000000",
  fontSize: "12px",
  wordBreak: "break-all",
};
const hr: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #E5E5E5",
  margin: "32px 0",
};
const footer: React.CSSProperties = {
  color: "#999999",
  fontSize: "12px",
  lineHeight: "1.5",
};