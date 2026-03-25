import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
 
interface WelcomeTemplateProps {
  firstName: string;
  role: string; // "customer" | "author" | "publisher"
}
 
const ROLE_COPY: Record<string, { headline: string; cta: string; ctaUrl: string }> = {
  customer: {
    headline: "Your library is waiting.",
    cta: "BROWSE BOOKS",
    ctaUrl: "/shop",
  },
  author: {
    headline: "Start writing your legacy.",
    cta: "GO TO DASHBOARD",
    ctaUrl: "/app",
  },
  publisher: {
    headline: "Build your publishing empire.",
    cta: "SET UP YOUR STORE",
    ctaUrl: "/app",
  },
};
 
export function WelcomeTemplate({ firstName, role }: WelcomeTemplateProps) {
  const copy = ROLE_COPY[role.toLowerCase()] ?? ROLE_COPY.customer;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://iwacumo.com";
 
  return (
    <Html>
      <Head />
      <Preview>Welcome to iwacumo, {firstName}! Your account is verified.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>IWACUMO.</Heading>
          </Section>
 
          <Section style={content}>
            <Heading style={h1}>You&apos;re in.</Heading>
            <Text style={greeting}>Welcome, {firstName}!</Text>
            <Text style={paragraph}>
              Your email is verified. {copy.headline}
            </Text>
 
            <Section style={buttonContainer}>
              <Button href={`${appUrl}${copy.ctaUrl}`} style={button}>
                {copy.cta}
              </Button>
            </Section>
 
            <Text style={paragraph}>
              If you have any questions, reply to this email and our team will
              get back to you.
            </Text>
            <Text style={footer}>— The iwacumo team</Text>
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
const header: React.CSSProperties = { backgroundColor: "#000000", padding: "24px 40px" };
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
  fontSize: "32px",
  fontWeight: "900",
  fontStyle: "italic",
  textTransform: "uppercase",
  margin: "0 0 16px",
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
const buttonContainer: React.CSSProperties = { textAlign: "center", margin: "32px 0" };
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
const footer: React.CSSProperties = { color: "#999999", fontSize: "13px", marginTop: "24px" }