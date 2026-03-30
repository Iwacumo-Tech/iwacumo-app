import * as React from "react";
import {
  Body, Button, Container, Head, Heading,
  Hr, Html, Preview, Section, Text,
} from "@react-email/components";
 
interface StaffInviteTemplateProps {
  inviterName: string;  // e.g. "Chidi Okeke" or "The iwacumo team"
  role: string;         // e.g. "staff-content"
  setupUrl: string;
}
 
const ROLE_LABELS: Record<string, string> = {
  "staff-basic":     "Staff — Basic Access",
  "staff-content":   "Staff — Content Manager",
  "staff-publisher": "Staff — Publisher Manager",
  "staff-finance":   "Staff — Finance & Settings",
  "super-admin":     "Super Administrator",
};
 
export function StaffInviteTemplate({
  inviterName,
  role,
  setupUrl,
}: StaffInviteTemplateProps) {
  const roleLabel = ROLE_LABELS[role] ?? role;
 
  return (
    <Html>
      <Head />
      <Preview>You've been invited to join the iwacumo team</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>IWACUMO.</Heading>
          </Section>
 
          <Section style={content}>
            <Heading style={h1}>You&apos;re Invited.</Heading>
 
            <Text style={paragraph}>
              <strong>{inviterName}</strong> has invited you to join the iwacumo
              platform as <strong>{roleLabel}</strong>.
            </Text>
 
            <Text style={paragraph}>
              Click the button below to set up your account. This link expires
              in <strong>7 days</strong>.
            </Text>
 
            <Section style={buttonContainer}>
              <Button href={setupUrl} style={button}>
                SET UP MY ACCOUNT
              </Button>
            </Section>
 
            <Text style={smallText}>Or copy and paste this URL:</Text>
            <Text style={link}>{setupUrl}</Text>
 
            <Hr style={hr} />
 
            <Text style={footer}>
              If you weren&apos;t expecting this invite, you can safely ignore this
              email. The link will expire automatically.
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
const header: React.CSSProperties = { backgroundColor: "#000000", padding: "24px 40px" };
const logo: React.CSSProperties = {
  color: "#FFD700", fontSize: "28px", fontWeight: "900",
  fontStyle: "italic", letterSpacing: "-1px", margin: "0",
};
const content: React.CSSProperties = {
  backgroundColor: "#ffffff", border: "2px solid #000000", padding: "40px",
};
const h1: React.CSSProperties = {
  color: "#0A0A0A", fontSize: "32px", fontWeight: "900",
  fontStyle: "italic", textTransform: "uppercase", margin: "0 0 24px",
};
const paragraph: React.CSSProperties = {
  color: "#444444", fontSize: "15px", lineHeight: "1.6", margin: "0 0 16px",
};
const buttonContainer: React.CSSProperties = { textAlign: "center", margin: "32px 0" };
const button: React.CSSProperties = {
  backgroundColor: "#FFD700", border: "2px solid #000000", color: "#000000",
  display: "inline-block", fontSize: "13px", fontWeight: "900",
  letterSpacing: "2px", padding: "16px 40px",
  textDecoration: "none", textTransform: "uppercase",
};
const smallText: React.CSSProperties = { color: "#888888", fontSize: "12px", margin: "24px 0 4px" };
const link: React.CSSProperties = { color: "#000000", fontSize: "12px", wordBreak: "break-all" };
const hr: React.CSSProperties = { border: "none", borderTop: "1px solid #E5E5E5", margin: "32px 0" };
const footer: React.CSSProperties = { color: "#999999", fontSize: "12px", lineHeight: "1.5" };
 