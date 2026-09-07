// AWS Price List の region index.json を切り詰めた固定入力。
// インデント幅が意味を持つのでそのまま維持すること。
// od-pricing.mjs の走査器は update-od-pricing / update-regions の両方が使うので、
// フィクスチャもここに置いて両方のテストから読む。
export const PRICE_LIST_FIXTURE = `{
  "formatVersion" : "v1.0",
  "offerCode" : "AmazonEC2",
  "products" : {
    "AAAAAAAAAAAAAAAA" : {
      "sku" : "AAAAAAAAAAAAAAAA",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "p5.48xlarge",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared",
        "preInstalledSw" : "NA",
        "capacitystatus" : "Used",
        "licenseModel" : "No License required"
      }
    },
    "BBBBBBBBBBBBBBBB" : {
      "sku" : "BBBBBBBBBBBBBBBB",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "p5.48xlarge",
        "operatingSystem" : "Windows",
        "tenancy" : "Shared",
        "preInstalledSw" : "NA",
        "capacitystatus" : "Used",
        "licenseModel" : "No License required"
      }
    },
    "CCCCCCCCCCCCCCCC" : {
      "sku" : "CCCCCCCCCCCCCCCC",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "p5.48xlarge",
        "operatingSystem" : "Linux",
        "tenancy" : "Dedicated",
        "preInstalledSw" : "NA",
        "capacitystatus" : "Used",
        "licenseModel" : "No License required"
      }
    },
    "DDDDDDDDDDDDDDDD" : {
      "sku" : "DDDDDDDDDDDDDDDD",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "p5.48xlarge",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared",
        "preInstalledSw" : "NA",
        "capacitystatus" : "UnusedCapacityReservation",
        "licenseModel" : "No License required"
      }
    },
    "EEEEEEEEEEEEEEEE" : {
      "sku" : "EEEEEEEEEEEEEEEE",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "g6f.large",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared",
        "preInstalledSw" : "NA",
        "capacitystatus" : "Used",
        "licenseModel" : "No License required"
      }
    },
    "FFFFFFFFFFFFFFFF" : {
      "sku" : "FFFFFFFFFFFFFFFF",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "m5.large",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared",
        "preInstalledSw" : "NA",
        "capacitystatus" : "Used",
        "licenseModel" : "No License required"
      }
    }
  },
  "terms" : {
    "OnDemand" : {
      "AAAAAAAAAAAAAAAA" : {
        "AAAAAAAAAAAAAAAA.JRTCKXETXF" : {
          "offerTermCode" : "JRTCKXETXF",
          "priceDimensions" : {
            "AAAAAAAAAAAAAAAA.JRTCKXETXF.6YS6EN2CT7" : {
              "unit" : "Hrs",
              "pricePerUnit" : {
                "USD" : "55.0440000000"
              },
              "appliesTo" : [ ]
            }
          },
          "termAttributes" : { }
        }
      },
      "BBBBBBBBBBBBBBBB" : {
        "BBBBBBBBBBBBBBBB.JRTCKXETXF" : {
          "priceDimensions" : {
            "BBBBBBBBBBBBBBBB.JRTCKXETXF.6YS6EN2CT7" : {
              "unit" : "Hrs",
              "pricePerUnit" : {
                "USD" : "99.9900000000"
              },
              "appliesTo" : [ ]
            }
          },
          "termAttributes" : { }
        }
      },
      "EEEEEEEEEEEEEEEE" : {
        "EEEEEEEEEEEEEEEE.JRTCKXETXF" : {
          "priceDimensions" : {
            "EEEEEEEEEEEEEEEE.JRTCKXETXF.6YS6EN2CT7" : {
              "unit" : "Hrs",
              "pricePerUnit" : {
                "USD" : "0.2010000000"
              },
              "appliesTo" : [ ]
            }
          },
          "termAttributes" : { }
        }
      },
      "FFFFFFFFFFFFFFFF" : {
        "FFFFFFFFFFFFFFFF.JRTCKXETXF" : {
          "priceDimensions" : {
            "FFFFFFFFFFFFFFFF.JRTCKXETXF.6YS6EN2CT7" : {
              "unit" : "Hrs",
              "pricePerUnit" : {
                "USD" : "0.0960000000"
              },
              "appliesTo" : [ ]
            }
          },
          "termAttributes" : { }
        }
      }
    },
    "Reserved" : {
      "AAAAAAAAAAAAAAAA" : {
        "AAAAAAAAAAAAAAAA.4NA7Y494T4" : {
          "priceDimensions" : {
            "AAAAAAAAAAAAAAAA.4NA7Y494T4.6YS6EN2CT7" : {
              "unit" : "Hrs",
              "pricePerUnit" : {
                "USD" : "11.1100000000"
              },
              "appliesTo" : [ ]
            }
          },
          "termAttributes" : { }
        }
      }
    }
  },
  "attributesList" : { }
}
`;

