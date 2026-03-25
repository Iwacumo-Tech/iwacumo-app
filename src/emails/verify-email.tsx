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
 
interface VerifyEmailTemplateProps {
  firstName: string;
  verifyUrl: string;
}
 
export function VerifyEmailTemplate({
  firstName,
  verifyUrl,
}: VerifyEmailTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email to activate your iwacumo account</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>IWACUMO.</Heading>
          </Section>
 
          {/* Content */}
          <Section style={content}>
            <Heading style={h1}>Verify Your Email</Heading>
            <Text style={greeting}>Hey {firstName},</Text>
            <Text style={paragraph}>
              Welcome to iwacumo — the African literary revolution. One last step
              before you can access your account: confirm your email address.
            </Text>
            <Text style={paragraph}>
              This link expires in <strong>24 hours</strong>.
            </Text>
 
            <Section style={buttonContainer}>
              <Button href={verifyUrl} style={button}>
                VERIFY MY EMAIL
              </Button>
            </Section>
 
            <Text style={smallText}>
              Or copy and paste this URL into your browser:
            </Text>
            <Text style={link}>{verifyUrl}</Text>
 
            <Hr style={hr} />
 
            <Text style={footer}>
              If you didn&apos;t create an iwacumo account, you can safely ignore
              this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
 
// ─── Styles ──────────────────────────────────────────────────
 
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
  // Note: box-shadow not supported in all email clients, skipped intentionally
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
 