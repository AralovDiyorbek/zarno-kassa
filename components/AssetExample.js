import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

export default function AssetExample() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ZARNO Kassa</Text>

      <Image
        style={styles.logo}
        source={require("../assets/zarno-kassa-icon.png")}
        resizeMode="contain"
      />

      <Text style={styles.text}>
        ZARNO Kassa ilovasi
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },

  logo: {
    width: 260,
    height: 260,
  },

  text: {
    marginTop: 20,
    fontSize: 14,
    textAlign: "center",
  },
});