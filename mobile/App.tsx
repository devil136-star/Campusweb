import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { User } from "./src/lib/api";
import { clearAuth, getToken, getUser } from "./src/lib/auth";
import { connectSocket, disconnectSocket } from "./src/lib/socket";
import { AuthScreen } from "./src/screens/AuthScreen";
import { HomeScreen } from "./src/screens/HomeScreen";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      const storedToken = await getToken();
      const storedUser = await getUser();
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        connectSocket(storedToken);
      }
      setLoading(false);
    })();
  }, []);

  const handleLogout = async () => {
    await clearAuth();
    disconnectSocket();
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!token || !user) {
    return (
      <>
        <AuthScreen
          onAuth={(newToken, newUser) => {
            setToken(newToken);
            setUser(newUser);
          }}
        />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <>
      <HomeScreen token={token} user={user} onLogout={handleLogout} />
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },
});
