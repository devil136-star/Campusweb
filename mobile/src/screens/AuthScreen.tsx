import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, ApiError } from "../lib/api";
import { saveAuth } from "../lib/auth";
import { connectSocket } from "../lib/socket";
import { User } from "../lib/api";

interface AuthScreenProps {
  onAuth: (token: string, user: User) => void;
}

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(email, password, name);
      await saveAuth(result.token, result.user);
      connectSocket(result.token);
      onAuth(result.token, result.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>C</Text>
        <Text style={styles.title}>CampusWeb</Text>
        <Text style={styles.subtitle}>
          {mode === "login" ? "Sign in to your campus" : "Create your account"}
        </Text>

        {mode === "register" && (
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email (.edu, .ac.in, Gmail)"
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={submit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {mode === "login" ? "Sign in" : "Create account"}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")}>
          <Text style={styles.switch}>
            {mode === "login" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617", justifyContent: "center", padding: 24 },
  card: { backgroundColor: "#0f172a", borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#1e293b" },
  logo: {
    alignSelf: "center",
    width: 56,
    height: 56,
    lineHeight: 56,
    textAlign: "center",
    backgroundColor: "#4f46e5",
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    borderRadius: 16,
    marginBottom: 12,
  },
  title: { color: "#fff", fontSize: 24, fontWeight: "700", textAlign: "center" },
  subtitle: { color: "#94a3b8", textAlign: "center", marginBottom: 20, marginTop: 4 },
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 14,
    color: "#fff",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  error: { color: "#f87171", marginBottom: 12, fontSize: 14 },
  button: {
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  switch: { color: "#818cf8", textAlign: "center", marginTop: 16 },
});
