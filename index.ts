/*
 * firestore-toolbox
 *
 * Copyright © 2019-2020 Johannes Berggren <jb@learnlink.no>
 * MIT Licensed
 *
 */

"use strict";

import * as admin from "firebase-admin";

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
    firestoreInstance: admin.firestore.Firestore,
    collectionName: string,
    propertyName: string,
    propertyValue: object | string | number,
): Promise<string[]> {
  const updated: string[] = [];
  const collectionSnapshot = await firestoreInstance.collection(collectionName).get();

  await Promise.all(collectionSnapshot.docs.map(documentSnapshot => {
    const document = documentSnapshot.data();

    if (document[propertyName] === undefined) {
      const updateObject = {};
      updateObject[propertyName] = propertyValue;
      updated.push(documentSnapshot.id);
      return firestoreInstance.collection(collectionName).doc(documentSnapshot.id).update(document);
    }
  }));

  return updated;
};

/**
 * Takes in a collectionName and a propertyName, and converts all the corresponding values
 * from number to string.
 *
 * @param {string} collectionName
 * @param {string} propertyName
 * @returns {Promise<Object[]>} Array containing all the responses from Firestore.
 */
export async function convertPropertyFromNumberToString(
    firestoreInstance: admin.firestore.Firestore,
    collectionName: string,
    propertyName: string,
) {
  const collectionSnapshot = await firestoreInstance.collection(collectionName).get();

  return Promise.all(collectionSnapshot.docs.map(d => {
    const ID = d.id,
        data = d.data();

    if (data[propertyName] === 0 || data[propertyName] === "0") {
      data[propertyName] = "";
    }
    else if (typeof data[propertyName] === "number") {
      data[propertyName] = data[propertyName] + "";
    }

    return firestoreInstance.collection(collectionName).doc(ID).update(data);
  }));
};

/**
 *
 * @param {string} collectionName
 * @param {Array} idList
 * @returns {Promise<Object[]>} Array containing all the responses from Firestore.
 */
export async function deleteDocumentsFromCollection(
    firestoreInstance: admin.firestore.Firestore,
    collectionName: string,
    idList: string[],
) {
  if (!Array.isArray(idList)) {
    throw new Error("Parameter idList must be array of strings.");
  }

  return Promise.all(idList.map(documentID => {
    return firestoreInstance.collection(collectionName).doc(documentID + "").delete();
  }));
};

export async function deletePropFromAllDocumentsInCollection(
    firestoreInstance: admin.firestore.Firestore,
    collectionName: string,
    propertyName: string,
): Promise<string[]> {
  const collectionSnapshot = await firestoreInstance.collection(collectionName).get();
  const updated: string[] = [];

  await Promise.all(collectionSnapshot.docs.map(async (doc) => {
    const updateObject: any = {};
    updateObject[propertyName] = admin.firestore.FieldValue.delete();
    updated.push(doc.id);
    return firestoreInstance.collection(collectionName).doc(doc.id + "").update(updateObject);
  }));

  return updated;
};

export async function replaceValuesForAllDocumentsWhere(
    firestoreInstance: admin.firestore.Firestore,
    collectionName: string,
    propertyName: string,
    comparison: "<" | "<=" | "==" | ">=" | ">" | "array-contains" | "in" | "array-contains-any",
    equalTo: string | number,
    newValue: string | number,
) {
  const updated = [];

  const documentSnapshot = await firestoreInstance.collection(collectionName).where(propertyName, comparison, equalTo).get();

  console.log("Snapshot size " + documentSnapshot.size);

  await Promise.all(documentSnapshot.docs.map((doc) => {
    const documentID = doc.id;
    const documentData = doc.data();

    documentData[propertyName] = newValue;
    updated.push(documentID);

    return firestoreInstance.collection(collectionName).doc(documentID).update(documentData);
  }));

  console.log("Updated " + updated.length + " documents.");

  return updated;
};

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
    firestoreInstance: admin.firestore.Firestore,
    currentName: string, newName: string,
) {
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
};
