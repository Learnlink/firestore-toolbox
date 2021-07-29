/*
 * firestore-toolbox
 *
 * Copyright © 2019-2021 Learnlink AS <engineering@learnlink.no>
 * MIT Licensed
 *
 */

"use strict";

import { firestore } from "firebase-admin";

type Type = "string" | "number" | "boolean" | "array" | "object";

/**
 * Lets you specify a collection, a property name and a value,
 * and populate all documents in the collection with the property.
 *
 * @param {string} collectionName
 * @param {string} propertyName
 * @param {Object|string|number} propertyValue
 * @returns {Promise<Object[]>} Array containing all the responses from Firestore.
 */
export async function addPropertyToAllDocumentsInCollection(
  firestoreInstance: firestore.Firestore,
  collectionName: string,
  propertyName: string,
  propertyValue: Record<string, unknown> | string | number,
): Promise<string[]> {
  const updated: string[] = [];
  const collectionSnapshot = await firestoreInstance.collection(collectionName).get();

  await Promise.all(collectionSnapshot.docs.map(documentSnapshot => {
    const document = documentSnapshot.data();

    if (document[propertyName] === undefined) {
      const updateObject = {};
      updateObject[propertyName] = propertyValue;
      updated.push(documentSnapshot.id);
      return firestoreInstance.collection(collectionName).doc(documentSnapshot.id).update(updateObject);
    }
  }));

  return updated;
}

/**
 * Convert the type of a specific field with a specific type to a new type.
 * Also possible to pass in a new Initial value to initate the new type in the field
 * If unspecified it will set the new value of the field to be the "empty" equivalent (e.g "" for strings and 0 for number types)
 * @param firestoreInstance
 * @param collectionName
 * @param propertyName
 * @param fromType
 * @param toType
 * @param newInitialValue
 */
export async function convertPropertyType(
  firestoreInstance: firestore.Firestore,
  collectionName: string,
  propertyName: string,
  fromType: Type,
  toType: Type,
  newInitialValue?: unknown,
): Promise<string[]> {
  const collectionSnapshot = await firestoreInstance.collection(collectionName).get();

  const updated: string[] = [];

  await Promise.all(collectionSnapshot.docs.map(doc => {
    const ID = doc.id,
      data = doc.data();
    if (getType(data[propertyName]) === fromType) {
      if (newInitialValue) {
        data[propertyName] = newInitialValue;
      }
      else {
        data[propertyName] = getInitialValue(toType);
      }
      updated.push(ID);
      return firestoreInstance.collection(collectionName).doc(ID).update(data);
    }
  }));

  return updated;
}

/**
 * @param {string} collectionName
 * @param {Array} idList
 * @returns {Promise<Object[]>} Array containing all the responses from Firestore.
 */
export async function deleteDocumentsFromCollection(
  firestoreInstance: firestore.Firestore,
  collectionName: string,
  idList: string[],
) {
  if (!Array.isArray(idList)) {
    throw new Error("Parameter idList must be array of strings.");
  }

  return Promise.all(idList.map(documentID => {
    return firestoreInstance.collection(collectionName).doc(documentID + "").delete();
  }));
}

export async function deletePropFromAllDocumentsInCollection(
  firestoreInstance: firestore.Firestore,
  collectionName: string,
  propertyName: string,
): Promise<string[]> {
  const collectionSnapshot = await firestoreInstance.collection(collectionName).get();
  const updated: string[] = [];

  await Promise.all(collectionSnapshot.docs.map(async (doc) => {
    const updateObject = {};
    updateObject[propertyName] = firestore.FieldValue.delete();
    updated.push(doc.id);
    return firestoreInstance.collection(collectionName).doc(doc.id + "").update(updateObject);
  }));

  return updated;
}

export async function replaceValuesForAllDocumentsWhere(
  firestoreInstance: firestore.Firestore,
  collectionName: string,
  propertyName: string,
  comparison: FirebaseFirestore.WhereFilterOp,
  equalTo: string | number,
  newValue: string | number,
): Promise<string[]> {
  const updated: string[] = [];

  const documentSnapshots = await firestoreInstance
    .collection(collectionName)
    .where(propertyName, comparison, equalTo)
    .get();

  console.log("Snapshot size " + documentSnapshots.size);

  await Promise.all(documentSnapshots.docs.map((doc) => {
    const documentID = doc.id;
    const documentData = doc.data();

    documentData[propertyName] = newValue;
    updated.push(documentID);

    return firestoreInstance
      .collection(collectionName)
      .doc(documentID)
      .update(documentData);
  }));

  console.log("Updated " + updated.length + " documents.");

  return updated;
}

/**
 * Renames a collection by running through the current collection, copying all documents
 * to a collection given the new name, and deleting all the documents from the old
 * collection that where successfully copied to the new collection.
 *
 * @param {string} currentName
 * @param {string} newName
 * @returns {Promise<[]>} Promise that resolves with a string-array of all docIDs moved.
 */
export async function renameCollection(
  firestoreInstance: firestore.Firestore,
  currentName: string, newName: string,
): Promise<void> {
  const collectionSnapshot = await firestoreInstance.collection(currentName).get();

  collectionSnapshot.docs.map(async doc => {
    try {
      await firestoreInstance.collection(newName).doc(doc.id + "").set(doc.data());
      await firestoreInstance.collection(currentName).doc(doc.id + "").delete();
    }
    catch (e) {
      console.error(e);
    }
  });
}

/**
 * Returns an initatorvalue for a field based on type input.
 * @param type
 */
function getInitialValue(type: string) {
  if (type === "string") {
    return "";
  }
  else if (type === "number") {
    return 0;
  }
  else if (type === "boolean") {
    return false;
  }
  else if (type === "array") {
    return [];
  }
  else if (type === "object") {
    return {};
  }

  const errorMessage = "Cannot init value of type " + type;
  throw new Error(errorMessage);
}

function getType(val: unknown) {
  if (val === null) {
    return "null";
  }
  else if (typeof val === "undefined") {
    return "undefined";
  }
  else if (typeof val === "string") {
    return "string";
  }
  else if (typeof val === "number" && !isNaN(val)) {
    if (Number.isInteger(val)) {
      return "integer";
    }
    return "float";
  }
  else if (typeof val === "boolean") {
    return "boolean";
  }
  else if (Array.isArray(val)) {
    return "array";
  }
  else if (typeof val === "object" && Object.keys(val).length) {
    return "object";
  }
}
