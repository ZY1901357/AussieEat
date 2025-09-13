import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';

export default function BackendTest() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch("http://172.22.64.1/")   // Replace with your IP if using phone EXPO
      .then(res => res.text())
      .then(data => setMessage(data))
      .catch(err => setMessage("Error: " + err.message));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
